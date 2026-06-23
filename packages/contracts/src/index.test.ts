import { describe, expect, it } from "vitest";
import { createEvent, validateLessonReport } from "./index.js";

describe("contracts", () => {
  it("creates versioned websocket events", () => {
    const event = createEvent({
      id: "event-1",
      sequence: 12,
      type: "call.ringing",
      sessionId: "session-1",
      payload: { callAttemptId: "call-1" }
    });

    expect(event.version).toBe(1);
    expect(event.sequence).toBe(12);
  });

  it("rejects invalid report scores", () => {
    expect(() =>
      validateLessonReport({
        summary: "done",
        goalAchievementScore: 101,
        fluencyScore: 80,
        grammarScore: 80,
        vocabularyScore: 80,
        pronunciationScore: null,
        userSpeakingRatio: 0.5,
        targetExpressions: [],
        goodExpressions: [],
        corrections: [],
        newVocabulary: [],
        reviewItems: [],
        nextLessonRecommendation: { lessonTemplateSlug: "hotel-checkin-a1", reasonKo: "next" },
        confidence: {}
      })
    ).toThrow(/goalAchievementScore/);
  });
});
