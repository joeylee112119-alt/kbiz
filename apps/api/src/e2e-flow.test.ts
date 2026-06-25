import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@aiphone/database";
import { AppModule } from "./modules/app.module.js";

const runDbE2e = Boolean(process.env.DATABASE_URL);

describe.runIf(runDbE2e)("API HTTP + PostgreSQL end-to-end lesson flow", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  async function createApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const created = moduleRef.createNestApplication();
    created.setGlobalPrefix("v1");
    await created.init();
    return created;
  }

  beforeAll(async () => {
    process.env.APP_MODE = "mock";
    process.env.MOCK_REALTIME = "true";
    prisma = new PrismaClient();
    await prisma.$connect();
    await resetMutableData(prisma);
    app = await createApp();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it("persists guest auth through push-opened lesson start, report, and review generation", async () => {
    const guest = await request(app.getHttpServer()).post("/v1/auth/guest").send().expect(201);
    const userId = guest.body.data.user.id as string;

    await request(app.getHttpServer())
      .put("/v1/me/learner-profile")
      .send({
        userId,
        level: "A1",
        englishVariant: "AMERICAN",
        goals: ["TRAVEL"],
        difficultAreas: ["VOCAB_RECALL"],
        correctionPreference: "IMMEDIATE_IMPORTANT_ONLY",
        interests: ["travel"],
        dailyStudyMinutes: 15,
        timezone: "Asia/Seoul"
      })
      .expect(200);

    await request(app.getHttpServer()).post("/v1/onboarding/complete").send({ userId }).expect(201);

    const schedule = await request(app.getHttpServer())
      .post("/v1/lesson-schedules")
      .send({
        userId,
        daysOfWeek: [1, 3, 5],
        localTime: "20:30",
        timezone: "Asia/Seoul",
        durationMinutes: 15,
        preReminderMinutes: 10,
        enabled: true
      })
      .expect(201);
    expect(schedule.body.data.id).toBeTruthy();
    const scheduleId = schedule.body.data.id as string;

    const occurrences = await request(app.getHttpServer()).get("/v1/lesson-occurrences").expect(200);
    const occurrence = occurrences.body.data.find((item: { scheduleId: string }) => item.scheduleId === scheduleId);
    expect(occurrence).toBeTruthy();
    const occurrenceId = occurrence.id as string;

    const delivery = await request(app.getHttpServer()).post("/v1/notifications/test").send({ occurrenceId }).expect(201);
    const deliveryId = delivery.body.data.id as string;
    expect(delivery.body.data.status).toBe("SENT");

    const opened = await request(app.getHttpServer()).post(`/v1/notifications/deliveries/${deliveryId}/open`).send().expect(201);
    expect(opened.body.data.status).toBe("OPENED");

    const ready = await request(app.getHttpServer()).post(`/v1/lesson-occurrences/${occurrenceId}/open`).send({ notificationDeliveryId: deliveryId }).expect(201);
    expect(ready.body.data.status).toBe("READY");

    const started = await request(app.getHttpServer()).post(`/v1/lesson-occurrences/${occurrenceId}/start`).send({ notificationDeliveryId: deliveryId }).expect(201);
    const lessonSessionId = started.body.data.lessonSessionId as string;
    expect(lessonSessionId).toBeTruthy();

    await request(app.getHttpServer()).post(`/v1/lesson-sessions/${lessonSessionId}/start`).send().expect(201);
    const transitioned = await request(app.getHttpServer()).post(`/v1/lesson-sessions/${lessonSessionId}/stage-transition`).send().expect(201);
    expect(transitioned.body.data.decision.to).toBe("WARM_UP");

    await request(app.getHttpServer())
      .post(`/v1/lesson-sessions/${lessonSessionId}/transcript-events`)
      .send({ transcript: "I'd like to check in please." })
      .expect(201);

    await request(app.getHttpServer()).post(`/v1/lesson-sessions/${lessonSessionId}/end`).send().expect(201);
    await request(app.getHttpServer()).post(`/v1/lesson-sessions/${lessonSessionId}/report/generate`).send().expect(201);

    const report = await request(app.getHttpServer()).get(`/v1/lesson-sessions/${lessonSessionId}/report`).expect(200);
    expect(report.body.data.summary).toContain("호텔 체크인");

    const review = await request(app.getHttpServer()).post(`/v1/lesson-sessions/${lessonSessionId}/review-items/generate`).send().expect(201);
    expect(review.body.data).toHaveLength(1);

    await app.close();
    app = await createApp();

    const restoredOccurrence = await request(app.getHttpServer()).get(`/v1/lesson-occurrences/${occurrenceId}`).expect(200);
    expect(restoredOccurrence.body.data.status).toBe("COMPLETED");

    const restoredSession = await request(app.getHttpServer()).get(`/v1/lesson-sessions/${lessonSessionId}`).expect(200);
    expect(restoredSession.body.data.stage).toBe("COMPLETED");

    const restoredReport = await request(app.getHttpServer()).get(`/v1/lesson-sessions/${lessonSessionId}/report`).expect(200);
    expect(restoredReport.body.data.summary).toContain("호텔 체크인");

    const dbCounts = {
      users: await prisma.user.count(),
      schedules: await prisma.lessonSchedule.count(),
      occurrences: await prisma.lessonOccurrence.count(),
      notificationDeliveries: await prisma.notificationDelivery.count(),
      sessions: await prisma.lessonSession.count(),
      transcriptSegments: await prisma.transcriptSegment.count(),
      reports: await prisma.lessonReport.count(),
      reviewItems: await prisma.reviewItem.count(),
      outboxEvents: await prisma.outboxEvent.count()
    };
    expect(dbCounts).toMatchObject({
      users: 1,
      schedules: 1,
      occurrences: 1,
      notificationDeliveries: 1,
      sessions: 1,
      transcriptSegments: 1,
      reports: 1,
      reviewItems: 1
    });
    expect(dbCounts.outboxEvents).toBeGreaterThanOrEqual(4);
  });
});

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
    prisma.notificationDelivery.deleteMany(),
    prisma.lessonOccurrence.deleteMany(),
    prisma.lessonSchedule.deleteMany(),
    prisma.pushToken.deleteMany(),
    prisma.device.deleteMany(),
    prisma.learnerProfile.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.userIdentity.deleteMany(),
    prisma.user.deleteMany()
  ]);
}
