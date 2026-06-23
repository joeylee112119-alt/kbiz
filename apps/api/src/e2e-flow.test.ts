import { describe, expect, it, beforeEach } from "vitest";
import { AuthController } from "./routes/auth.controller.js";
import { OnboardingController } from "./routes/onboarding.controller.js";
import { SchedulesController } from "./routes/schedules.controller.js";
import { CallsController } from "./routes/calls.controller.js";
import { LessonsController } from "./routes/lessons.controller.js";
import { MockAppService } from "./services/mock-app.service.js";

describe("mock API end-to-end lesson flow", () => {
  let auth: AuthController;
  let onboarding: OnboardingController;
  let schedules: SchedulesController;
  let calls: CallsController;
  let lessons: LessonsController;

  beforeEach(() => {
    const service = new MockAppService();
    auth = new AuthController(service);
    onboarding = new OnboardingController(service);
    schedules = new SchedulesController(service);
    calls = new CallsController(service);
    lessons = new LessonsController(service);
  });

  it("guest auth to review item generation", async () => {
    const guest = auth.guest();
    const userId = ((guest.data as Record<string, unknown>).user as Record<string, unknown>).id as string;

    onboarding.learnerProfile({
        userId,
        level: "A1",
        englishVariant: "AMERICAN",
        goals: ["TRAVEL"],
        difficultAreas: ["VOCAB_RECALL"],
        correctionPreference: "IMMEDIATE_IMPORTANT_ONLY",
        interests: ["travel"],
        dailyStudyMinutes: 15,
        timezone: "Asia/Seoul"
      });

    onboarding.complete();

    const schedule = schedules.create({
        userId,
        weekdays: [1, 3, 5],
        localTime: "20:30",
        timezone: "Asia/Seoul",
        lessonDurationMinutes: 15,
        holidayPauseEnabled: true
      });
    expect((schedule.data as Record<string, unknown>).id).toBeTruthy();

    const call = calls.startNow({ userId });
    const callId = (call.data as Record<string, unknown>).id as string;

    const accepted = calls.accept(callId);
    const lessonSessionId = (accepted.data as Record<string, unknown>).lessonSessionId as string;
    expect(lessonSessionId).toBeTruthy();

    lessons.start(lessonSessionId);
    const transitioned = lessons.stageTransition(lessonSessionId);
    expect(((transitioned.data as Record<string, unknown>).decision as Record<string, unknown>).nextStage).toBe("WARM_UP");

    lessons.transcriptEvent(lessonSessionId, { transcript: "I'd like to check in please." });

    lessons.end(lessonSessionId);
    lessons.generateReport(lessonSessionId);
    const report = lessons.report(lessonSessionId);
    expect((report.data as Record<string, unknown>).summary).toContain("호텔 체크인");

    const review = lessons.generateReview(lessonSessionId);
    expect(review.data).toHaveLength(1);
  });
});
