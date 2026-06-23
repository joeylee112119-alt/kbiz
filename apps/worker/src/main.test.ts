import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@aiphone/database";
import { queueNames, startWorkerRuntime, type WorkerRuntime } from "./main.js";

const runWorkerE2e = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);

describe.runIf(runWorkerE2e)("BullMQ worker runtime", () => {
  let prisma: PrismaClient;
  let runtime: WorkerRuntime;

  beforeAll(async () => {
    process.env.APP_MODE = "mock";
    process.env.MOCK_PUSH = "true";
    prisma = new PrismaClient();
    await prisma.$connect();
    await resetMutableData(prisma);
    await resetQueues(process.env.REDIS_URL as string);
    await seedWorkerFixture(prisma);
    runtime = await startWorkerRuntime();
  });

  afterAll(async () => {
    await runtime?.close();
    await prisma?.$disconnect();
  });

  it("processes schedule-call into persisted call and notification jobs", async () => {
    const schedule = await prisma.callSchedule.findFirstOrThrow();
    await runtime.queues["schedule-call"].add(
      "schedule-call",
      { scheduleId: schedule.id, startsAt: new Date().toISOString() },
      { jobId: `test-schedule-call:${schedule.id}` }
    );

    const call = await waitFor(async () => {
      const row = await prisma.callAttempt.findFirst({ where: { scheduleId: schedule.id } });
      return row?.status === "RINGING" ? row : null;
    });

    const notifications = await waitFor(async () => {
      const rows = await prisma.notificationLog.findMany({ where: { callAttemptId: call?.id } });
      return rows.length === 2 ? rows : null;
    });
    expect(notifications.map((row) => row.type).sort()).toEqual(["INCOMING_CALL", "REMINDER"]);
  });
});

async function seedWorkerFixture(prisma: PrismaClient): Promise<void> {
  const user = await prisma.user.create({ data: { displayName: "Queue Learner", appState: "CALL_SCHEDULED" } });
  const tutor = await prisma.tutor.create({
    data: {
      name: "Emma",
      personaKo: "차분한 튜터",
      personaEn: "Calm tutor",
      imageUrl: "/assets/tutors/emma.png"
    }
  });
  await prisma.callSchedule.create({
    data: {
      userId: user.id,
      weekdays: [1],
      localTime: "20:30",
      timezone: "Asia/Seoul",
      lessonDurationMinutes: 15,
      holidayPauseEnabled: true,
      nextRunAt: new Date(Date.now() + 60_000),
      retryPolicy: { maxAttempts: 3 }
    }
  });
  expect(tutor.id).toBeTruthy();
}

async function resetQueues(redisUrl: string): Promise<void> {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  try {
    for (const name of queueNames) {
      const queue = new Queue(name, { connection });
      await queue.obliterate({ force: true });
      await queue.close();
    }
  } finally {
    await connection.quit();
  }
}

async function resetMutableData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.outboxEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.reviewItem.deleteMany(),
    prisma.lessonReport.deleteMany(),
    prisma.backchannelEvent.deleteMany(),
    prisma.transcriptSegment.deleteMany(),
    prisma.utterance.deleteMany(),
    prisma.lessonStageSession.deleteMany(),
    prisma.lessonSession.deleteMany(),
    prisma.notificationLog.deleteMany(),
    prisma.callAttempt.deleteMany(),
    prisma.callSchedule.deleteMany(),
    prisma.pushToken.deleteMany(),
    prisma.device.deleteMany(),
    prisma.learnerProfile.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.userIdentity.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tutorVoice.deleteMany(),
    prisma.backchannelClip.deleteMany(),
    prisma.tutor.deleteMany()
  ]);
}

async function waitFor<T>(read: () => Promise<T | null>, timeoutMs = 5000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for worker result");
}
