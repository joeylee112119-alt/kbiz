import type { CallAttempt } from "@aiphone/contracts";

export type PushProviderName = "mock" | "apns_voip" | "fcm" | "disabled";

export type PushPayload = {
  callAttemptId: string;
  tutorName: string;
  topicKo: string;
  expiresAt: string;
};

export type PushResult = {
  provider: PushProviderName;
  externalId: string;
  sentAt: string;
};

export interface PushProvider {
  sendIncomingCall(callAttempt: CallAttempt): Promise<PushResult>;
  sendReminder(callAttempt: CallAttempt): Promise<PushResult>;
}

export class MockPushProvider implements PushProvider {
  async sendIncomingCall(callAttempt: CallAttempt): Promise<PushResult> {
    return {
      provider: "mock",
      externalId: `mock-push-${callAttempt.id}`,
      sentAt: new Date().toISOString()
    };
  }

  async sendReminder(callAttempt: CallAttempt): Promise<PushResult> {
    return {
      provider: "mock",
      externalId: `mock-reminder-${callAttempt.id}`,
      sentAt: new Date().toISOString()
    };
  }
}

export class DisabledPushProvider implements PushProvider {
  async sendIncomingCall(callAttempt: CallAttempt): Promise<PushResult> {
    return this.disabledResult(callAttempt, "incoming-call");
  }

  async sendReminder(callAttempt: CallAttempt): Promise<PushResult> {
    return this.disabledResult(callAttempt, "reminder");
  }

  private disabledResult(callAttempt: CallAttempt, type: string): PushResult {
    return {
      provider: "disabled",
      externalId: `disabled-${type}-${callAttempt.id}`,
      sentAt: new Date().toISOString()
    };
  }
}

export function createPushProvider(env: NodeJS.ProcessEnv = process.env): PushProvider {
  const explicitMock = env.APP_MODE === "mock" || env.MOCK_PUSH === "true" || env.NODE_ENV === "test";
  if (explicitMock) return new MockPushProvider();
  return new DisabledPushProvider();
}

export function buildSafeIncomingCallPayload(callAttempt: CallAttempt): PushPayload {
  return {
    callAttemptId: callAttempt.id,
    tutorName: callAttempt.tutorId,
    topicKo: callAttempt.topicKo,
    expiresAt: callAttempt.expiresAt
  };
}
