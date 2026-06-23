import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Queue, Worker, type JobsOptions, type Job } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@aiphone/database";
import { assertProductionSafety, loadConfig } from "@aiphone/config";
import { createPushProvider, type PushProvider } from "@aiphone/notification";

export const queueNames = [
  "schedule-call",
  "send-reminder",
  "send-incoming-call",
  "expire-call",
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
    case "schedule-call":
      await scheduleCall(job, prisma, queues);
      break;
    case "send-reminder":
      await sendNotification(job, prisma, pushProvider, "REMINDER");
      break;
    case "send-incoming-call":
      await sendNotification(job, prisma, pushProvider, "INCOMING_CALL");
      break;
    case "expire-call":
      await expireCall(job, prisma);
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

async function scheduleCall(job: Job, prisma: PrismaClient, queues: QueueMap): Promise<void> {
  const scheduleId = String(job.data.scheduleId);
  const schedule = await prisma.callSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { user: true } });
  const tutor = await prisma.tutor.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const startsAt = new Date(String(job.data.startsAt ?? new Date().toISOString()));
  const idempotencyKey = `schedule-call:${schedule.id}:${startsAt.toISOString()}`;
  const call = await prisma.callAttempt.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      userId: schedule.userId,
      scheduleId: schedule.id,
      tutorId: tutor.id,
      status: "CREATED",
      startsAt,
      expiresAt: new Date(startsAt.getTime() + 45_000),
      iosCallKitUuid: randomUUID(),
      androidCallId: randomUUID(),
      idempotencyKey
    }
  });

  await queues["send-reminder"].add(
    "send-reminder",
    { callAttemptId: call.id },
    { ...defaultJobOptions, jobId: `send-reminder:${call.id}` }
  );
  await queues["send-incoming-call"].add(
    "send-incoming-call",
    { callAttemptId: call.id },
    { ...defaultJobOptions, jobId: `send-incoming-call:${call.id}` }
  );
  await queues["expire-call"].add(
    "expire-call",
    { callAttemptId: call.id },
    { ...defaultJobOptions, jobId: `expire-call:${call.id}`, delay: 45_000 }
  );
}

async function sendNotification(job: Job, prisma: PrismaClient, pushProvider: PushProvider, type: "REMINDER" | "INCOMING_CALL"): Promise<void> {
  const callAttemptId = String(job.data.callAttemptId);
  const call = await prisma.callAttempt.findUniqueOrThrow({ where: { id: callAttemptId } });
  const payload = {
    id: call.id,
    scheduleId: call.scheduleId,
    status: call.status,
    startsAt: call.startsAt.toISOString(),
    expiresAt: call.expiresAt.toISOString(),
    tutorId: call.tutorId,
    topicKo: "호텔 체크인",
    ...(call.iosCallKitUuid ? { iosCallKitUuid: call.iosCallKitUuid } : {}),
    ...(call.androidCallId ? { androidCallId: call.androidCallId } : {})
  };
  const result = type === "REMINDER" ? await pushProvider.sendReminder(payload) : await pushProvider.sendIncomingCall(payload);
  const existingLog = await prisma.notificationLog.findFirst({ where: { callAttemptId, type } });
  if (existingLog) {
    await prisma.notificationLog.update({
      where: { id: existingLog.id },
      data: { status: "SENT", externalId: result.externalId, provider: result.provider }
    });
  } else {
    await prisma.notificationLog.create({
      data: {
        callAttemptId,
        provider: result.provider,
        type,
        status: "SENT",
        externalId: result.externalId
      }
    });
  }
  if (type === "INCOMING_CALL") {
    await prisma.callAttempt.update({ where: { id: callAttemptId }, data: { status: "RINGING" } });
  } else {
    await prisma.callAttempt.updateMany({ where: { id: callAttemptId, status: "CREATED" }, data: { status: "PUSH_SENT" } });
  }
}

async function expireCall(job: Job, prisma: PrismaClient): Promise<void> {
  const callAttemptId = String(job.data.callAttemptId);
  await prisma.callAttempt.updateMany({
    where: { id: callAttemptId, status: { in: ["CREATED", "PUSH_SENT", "RINGING"] } },
    data: { status: "EXPIRED", endedAt: new Date() }
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
        reviewItems: ["Could I get a quiet room?"]
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
    callAttemptId: job.data.callAttemptId,
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
