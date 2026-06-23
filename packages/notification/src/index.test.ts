import { describe, expect, it } from "vitest";
import { MockPushProvider, buildSafeIncomingCallPayload } from "./index.js";

describe("notification", () => {
  it("does not include transcript data in incoming call payloads", async () => {
    const call = {
      id: "call-1",
      scheduleId: null,
      status: "RINGING" as const,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 45_000).toISOString(),
      tutorId: "tutor-emma",
      topicKo: "호텔 체크인"
    };
    const payload = buildSafeIncomingCallPayload(call);
    expect(payload).not.toHaveProperty("transcript");

    const result = await new MockPushProvider().sendIncomingCall(call);
    expect(result.provider).toBe("mock");
  });
});
