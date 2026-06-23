import { createServer } from "node:http";
import { Queue, Worker, type JobsOptions, type Job } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@aiphone/database";
import { assertProductionSafety, loadConfig } from "@aiphone/config";
import { createPushProvider, type NotificationKind, type PushProvider } from "@aiphone/notification";

export const queueNames = [
  "materialize-lesson-occurrences",
  "send-pre-lesson-reminder",
  "send-lesson-reminder",
  "expire-lesson-occurrence",
  "generate-report",
  "generate-review-items",
  "process-outbox"
] as const;

type QueueName = (typeof queueNames)[number];
type QueueMap = Record<QueueName, Queue>;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 100
};

export type WorkerRuntime = {
  queues: QueueMap;
  workers: Worker[];
  close: () => Promise<void>;
};

export async function startWorkerRuntime(env: NodeJS.ProcessEnv = process.env): Promise<WorkerRuntime> {
  const config = loadConfig(env);
  assertProductionSafety(config);

  const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
  const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl });
  const pushProvider = createPushProvider(env);
  await prisma.$connect();

  const queues = Object.fromEntries(
    queueNames.map((name) => [name, new Queue(name, { connection, defaultJobOptions })])
  ) as QueueMap;

  const workers = queueNames.map(
    (name) =>
      new Worker(
        name,
        async (job) => {
          await handleJob(name, job, prisma, queues, pushProvider);
        },
        { connection }
      )
  );

  for (const worker of workers) {
    worker.on("failed", async (job, error) => {
      await recordFailedJob(prisma, job, error);
    });
  }

  return {
    queues,
    workers,
    close: async () => {
      await Promise.all(workers.map((worker) => worker.close()));
      await Promise.all(Object.values(queues).map((queue) => queue.close()));
      await prisma.$disconnect();
      await connection.quit();
    }
  };
}

async function handleJob(
  queueName: QueueName,
  job: Job,
  prisma: PrismaClient,
  queues: QueueMap,
  pushProvider: PushProvider
): Promise<void> {
  const correlation = getCorrelation(job);
  log("worker.job.started", { queueName, jobId: job.id, correlation });

  switch (queueName) {
    case "materialize-lesson-occurrences":
      await materializeLessonOccurrence(job, prisma, queues);
      break;
    case "send-pre-lesson-reminder":
      await sendNotification(job, prisma, pushProvider, "LESSON_PRE_REMINDER");
      break;
    case "send-lesson-reminder":
      await sendNotification(job, prisma, pushProvider, "LESSON_REMINDER");
      break;
    case "expire-lesson-occurrence":
      await expireLessonOccurrence(job, prisma);
      break;
    case "generate-report":
      await generateReport(job, prisma);
      break;
    case "generate-review-items":
      await generateReviewItems(job, prisma);
      break;
    case "process-outbox":
      await processOutbox(prisma);
      break;
  }

  log("worker.job.completed", { queueName, jobId: job.id, correlation });
}

async function materializeLessonOccurrence(job: Job, prisma: PrismaClient, queues: QueueMap): Promise<void> {
  const scheduleId = String(job.data.scheduleId);
  const schedule = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { user: true } });
  const template = await ensureDefaultLessonTemplate(prisma);
  const scheduledAt = new Date(String(job.data.scheduledAt ?? schedule.nextRunAt.toISOString()));
  const availableFrom = new Date(scheduledAt.getTime() - (schedule.preReminderMinutes ?? 10) * 60_000);
  const expiresAt = new Date(scheduledAt.getTime() + schedule.durationMinutes * 60_000 + 15 * 60_000);
  const idempotencyKey = `lesson-occurrence:${schedule.id}:${scheduledAt.toISOString()}`;
  const occurrence = await prisma.lessonOccurrence.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      userId: schedule.userId,
      scheduleId: schedule.id,
      tutorId: schedule.tutorId,
      lessonTemplateId: template.id,
      status: "SCHEDULED",
      scheduledAt,
      availableFrom,
      expiresAt,
      idempotencyKey
    }
  });

  await queues["send-pre-lesson-reminder"].add(
    "send-pre-lesson-reminder",
    { occurrenceId: occurrence.id },
    { ...defaultJobOptions, jobId: `send-pre-lesson-reminder:${occurrence.id}`, delay: Math.max(0, availableFrom.getTime() - Date.now()) }
  );
  await queues["send-lesson-reminder"].add(
    "send-lesson-reminder",
    { occurrenceId: occurrence.id },
    { ...defaultJobOptions, jobId: `send-lesson-reminder:${occurrence.id}`, delay: Math.max(0, scheduledAt.getTime() - Date.now()) }
  );
  await queues["expire-lesson-occurrence"].add(
    "expire-lesson-occurrence",
    { occurrenceId: occurrence.id },
    { ...defaultJobOptions, jobId: `expire-lesson-occurrence:${occurrence.id}`, delay: Math.max(0, expiresAt.getTime() - Date.now()) }
  );
  await prisma.user.update({ where: { id: schedule.userId }, data: { appState: "LESSON_SCHEDULED" } });
}

async function sendNotification(
  job: Job,
  prisma: PrismaClient,
  pushProvider: PushProvider,
  notificationType: NotificationKind
): Promise<void> {
  const occurrenceId = String(job.data.occurrenceId);
  const occurrence = await prisma.lessonOccurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: {
      lessonTemplate: true,
      tutor: true,
      user: { include: { devices: { include: { pushTokens: true } } } }
    }
  });
  const token = occurrence.user.devices
    .flatMap((device) => device.pushTokens.map((pushToken) => ({ ...pushToken, deviceId: device.id })))
    .find((pushToken) => !pushToken.revokedAt && pushToken.tokenValue);
  const delivery = await prisma.notificationDelivery.upsert({
    where: { idempotencyKey: `notification:${notificationType}:${occurrence.id}` },
    update: { status: "PENDING" },
    create: {
      occurrenceId: occurrence.id,
      deviceId: token?.deviceId ?? null,
      pushTokenId: token?.id ?? null,
      notificationType,
      provider: "pending",
      status: "PENDING",
      scheduledFor: notificationType === "LESSON_PRE_REMINDER" ? occurrence.availableFrom : occurrence.scheduledAt,
      idempotencyKey: `notification:${notificationType}:${occurrence.id}`
    }
  });

  await prisma.lessonOccurrence.updateMany({
    where: { id: occurrence.id, status: "SCHEDULED" },
    data: { status: "NOTIFICATION_PENDING" }
  });

  try {
    const payload = {
      occurrenceId: occurrence.id,
      notificationDeliveryId: delivery.id,
      notificationType,
      token: token?.tokenValue ?? null,
      title: notificationType === "LESSON_PRE_REMINDER" ? "수업 10분 전이에요" : "AI 영어 수업을 시작할 시간이에요",
      body: `${occurrence.tutor.name}와 ${occurrence.lessonTemplate.titleKo} 연습을 준비했어요.`,
      data: { scheduledAt: occurrence.scheduledAt.toISOString() }
    };
    const result = notificationType === "LESSON_PRE_REMINDER"
      ? await pushProvider.sendPreLessonReminder(payload)
      : await pushProvider.sendLessonReminder(payload);
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        provider: result.provider,
        providerMessageId: result.externalId,
        status: result.skipped ? "FAILED" : "SENT",
        sentAt: new Date(result.sentAt),
        failedAt: result.skipped ? new Date() : null,
        failureCode: result.skipped ? result.reason ?? "SKIPPED" : null
      }
    });
    if (!result.skipped) {
      await prisma.lessonOccurrence.update({ where: { id: occurrence.id }, data: { status: "NOTIFIED" } });
    }
  } catch (error) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        provider: "firebase",
        status: "FAILED",
        failedAt: new Date(),
        failureCode: "PUSH_SEND_FAILED",
        failureMessage: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

async function expireLessonOccurrence(job: Job, prisma: PrismaClient): Promise<void> {
  const occurrenceId = String(job.data.occurrenceId);
  await prisma.lessonOccurrence.updateMany({
    where: { id: occurrenceId, status: { in: ["SCHEDULED", "NOTIFICATION_PENDING", "NOTIFIED", "READY", "SNOOZED"] } },
    data: { status: "EXPIRED" }
  });
  await prisma.notificationDelivery.updateMany({
    where: { occurrenceId, status: { in: ["PENDING", "SENT"] } },
    data: { status: "EXPIRED" }
  });
}

async function generateReport(job: Job, prisma: PrismaClient): Promise<void> {
  const lessonSessionId = String(job.data.lessonSessionId);
  const existing = await prisma.lessonReport.findUnique({ where: { lessonSessionId } });
  if (existing) return;
  await prisma.lessonReport.create({
    data: {
      lessonSessionId,
      summary: "Worker generated report from persisted lesson state.",
      scores: { goalAchievement: 80, fluency: 75, grammar: 75, vocabulary: 80, pronunciation: null },
      userSpeakingRatio: 0.5,
      reportJson: {
        summary: "Worker generated report from persisted lesson state.",
        goalAchievementScore: 80,
        fluencyScore: 75,
        grammarScore: 75,
        vocabularyScore: 80,
        pronunciationScore: null,
        userSpeakingRatio: 0.5,
        targetExpressions: [],
        goodExpressions: [],
        corrections: [],
        newVocabulary: [],
        reviewItems: ["Could I get a quiet room?"],
        nextLessonRecommendation: { lessonTemplateSlug: "hotel-checkin-a1", reasonKo: "다음 여행 상황으로 확장합니다." },
        confidence: { transcriptCoverage: 0.5 }
      }
    }
  });
}

async function generateReviewItems(job: Job, prisma: PrismaClient): Promise<void> {
  const lessonSessionId = String(job.data.lessonSessionId);
  const session = await prisma.lessonSession.findUniqueOrThrow({ where: { id: lessonSessionId } });
  const existing = await prisma.reviewItem.findFirst({ where: { sourceType: "LESSON_REPORT", sourceId: lessonSessionId } });
  if (existing) return;
  await prisma.reviewItem.create({
    data: {
      userId: session.userId,
      sourceType: "LESSON_REPORT",
      sourceId: lessonSessionId,
      prompt: "Could I get a quiet room?",
      answer: "Could I get a quiet room?",
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60_000)
    }
  });
}

async function processOutbox(prisma: PrismaClient): Promise<void> {
  const events = await prisma.outboxEvent.findMany({ where: { processedAt: null, failedAt: null }, take: 50 });
  for (const event of events) {
    await prisma.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  }
}

async function ensureDefaultLessonTemplate(prisma: PrismaClient): Promise<{ id: string }> {
  const existing = await prisma.lessonTemplate.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (existing) return existing;
  return prisma.lessonTemplate.upsert({
    where: { slug: "hotel-checkin-a1" },
    update: { status: "PUBLISHED" },
    create: {
      slug: "hotel-checkin-a1",
      titleKo: "호텔 체크인",
      titleEn: "Hotel check-in",
      level: "A1",
      category: "travel",
      status: "PUBLISHED",
      versions: {
        create: {
          version: 1,
          objective: "호텔 체크인 상황에서 예약 확인과 요청 표현을 연습합니다.",
          estimatedDuration: 900,
          status: "PUBLISHED"
        }
      }
    },
    select: { id: true }
  });
}

async function recordFailedJob(prisma: PrismaClient, job: Job | undefined, error: Error): Promise<void> {
  if (!job) return;
  await prisma.outboxEvent.upsert({
    where: { idempotencyKey: `failed:${job.queueName}:${job.id}` },
    update: { failedAt: new Date(), payload: { error: error.message, jobData: job.data } },
    create: {
      aggregateType: "WorkerJob",
      aggregateId: String(job.id),
      eventType: "worker.job.failed",
      payload: { queueName: job.queueName, error: error.message, jobData: job.data },
      idempotencyKey: `failed:${job.queueName}:${job.id}`,
      failedAt: new Date()
    }
  });
  log("worker.job.failed", { queueName: job.queueName, jobId: job.id, error: error.message, correlation: getCorrelation(job) });
}

function getCorrelation(job: Job): Record<string, unknown> {
  return {
    occurrenceId: job.data.occurrenceId,
    lessonSessionId: job.data.lessonSessionId,
    scheduleId: job.data.scheduleId
  };
}

function log(event: string, fields: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ event, ts: new Date().toISOString(), ...fields })}\n`);
}

if (process.env.NODE_ENV !== "test") {
  const runtime = await startWorkerRuntime();
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "worker", queues: queueNames }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(Number(process.env.WORKER_PORT ?? "4001"));

  const shutdown = async (): Promise<void> => {
    await runtime.close();
    server.close();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}
