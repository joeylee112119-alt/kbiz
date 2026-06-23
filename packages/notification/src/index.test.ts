import { describe, expect, it } from "vitest";
import { MockPushProvider, buildSafeNotificationData } from "./index.js";

describe("notification", () => {
  it("does not include transcript data in lesson reminder payloads", async () => {
    const reminder = {
      occurrenceId: "occurrence-1",
      notificationDeliveryId: "delivery-1",
      notificationType: "LESSON_REMINDER" as const,
      title: "AI 영어 수업을 시작할 시간이에요",
      body: "Emma와 호텔 체크인 연습을 준비했어요.",
      token: "test-fcm-token",
      data: { transcript: "must-not-be-added-by-caller" }
    };
    const payload = buildSafeNotificationData(reminder);
    expect(payload).not.toHaveProperty("transcript");
    expect(payload).toMatchObject({ occurrenceId: "occurrence-1", route: "LessonReady" });

    const result = await new MockPushProvider().sendLessonReminder(reminder);
    expect(result.provider).toBe("mock");
  });
});
