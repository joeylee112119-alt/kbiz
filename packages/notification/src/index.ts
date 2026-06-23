import { createSign, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

export type PushProviderName = "mock" | "firebase" | "disabled";

export type NotificationKind = "LESSON_PRE_REMINDER" | "LESSON_REMINDER" | "LESSON_SNOOZE_REMINDER" | "REPORT_READY";

export type PushPayload = {
  occurrenceId: string;
  notificationDeliveryId?: string;
  notificationType: NotificationKind;
  title: string;
  body: string;
  token?: string | null;
  data?: Record<string, string>;
};

export type PushResult = {
  provider: PushProviderName;
  externalId: string;
  sentAt: string;
  skipped?: boolean;
  reason?: string;
};

export type PushConfigurationStatus = {
  provider: PushProviderName;
  configured: boolean;
  missing: string[];
};

export interface PushProvider {
  registerDevice(input: { token: string; platform: string }): Promise<{ provider: PushProviderName; tokenLast4: string }>;
  sendLessonReminder(payload: PushPayload): Promise<PushResult>;
  sendPreLessonReminder(payload: PushPayload): Promise<PushResult>;
  sendTestNotification(payload: PushPayload): Promise<PushResult>;
  invalidateToken(input: { token: string; reason?: string }): Promise<{ provider: PushProviderName; invalidated: boolean }>;
  validateConfiguration(): Promise<PushConfigurationStatus>;
}

export class MockPushProvider implements PushProvider {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async registerDevice(input: { token: string }): Promise<{ provider: PushProviderName; tokenLast4: string }> {
    return { provider: "mock", tokenLast4: input.token.slice(-4) };
  }

  async sendLessonReminder(payload: PushPayload): Promise<PushResult> {
    return this.sent("lesson-reminder", payload);
  }

  async sendPreLessonReminder(payload: PushPayload): Promise<PushResult> {
    return this.sent("pre-lesson-reminder", payload);
  }

  async sendTestNotification(payload: PushPayload): Promise<PushResult> {
    return this.sent("test-notification", payload);
  }

  async invalidateToken(): Promise<{ provider: PushProviderName; invalidated: boolean }> {
    return { provider: "mock", invalidated: true };
  }

  async validateConfiguration(): Promise<PushConfigurationStatus> {
    return { provider: "mock", configured: true, missing: [] };
  }

  private async sent(prefix: string, payload: PushPayload): Promise<PushResult> {
    if (this.env.MOCK_NOTIFICATION_URL) {
      await fetch(this.env.MOCK_NOTIFICATION_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: prefix,
          occurrenceId: payload.occurrenceId,
          notificationDeliveryId: payload.notificationDeliveryId,
          notificationType: payload.notificationType,
          title: payload.title,
          body: payload.body,
          data: buildSafeNotificationData(payload)
        })
      }).catch(() => undefined);
    }
    return {
      provider: "mock",
      externalId: `mock-${prefix}-${payload.occurrenceId}-${randomUUID()}`,
      sentAt: new Date().toISOString()
    };
  }
}

export class DisabledPushProvider implements PushProvider {
  async registerDevice(input: { token: string }): Promise<{ provider: PushProviderName; tokenLast4: string }> {
    return { provider: "disabled", tokenLast4: input.token.slice(-4) };
  }

  async sendLessonReminder(payload: PushPayload): Promise<PushResult> {
    return this.skipped("lesson-reminder", payload);
  }

  async sendPreLessonReminder(payload: PushPayload): Promise<PushResult> {
    return this.skipped("pre-lesson-reminder", payload);
  }

  async sendTestNotification(payload: PushPayload): Promise<PushResult> {
    return this.skipped("test-notification", payload);
  }

  async invalidateToken(): Promise<{ provider: PushProviderName; invalidated: boolean }> {
    return { provider: "disabled", invalidated: false };
  }

  async validateConfiguration(): Promise<PushConfigurationStatus> {
    return { provider: "disabled", configured: false, missing: ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"] };
  }

  private skipped(prefix: string, payload: PushPayload): PushResult {
    return {
      provider: "disabled",
      externalId: `disabled-${prefix}-${payload.occurrenceId}`,
      sentAt: new Date().toISOString(),
      skipped: true,
      reason: "PUSH_PROVIDER_DISABLED"
    };
  }
}

export class FirebasePushProvider implements PushProvider {
  private accessToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async registerDevice(input: { token: string }): Promise<{ provider: PushProviderName; tokenLast4: string }> {
    return { provider: "firebase", tokenLast4: input.token.slice(-4) };
  }

  async sendLessonReminder(payload: PushPayload): Promise<PushResult> {
    return this.sendFcm(payload);
  }

  async sendPreLessonReminder(payload: PushPayload): Promise<PushResult> {
    return this.sendFcm(payload);
  }

  async sendTestNotification(payload: PushPayload): Promise<PushResult> {
    return this.sendFcm(payload);
  }

  async invalidateToken(): Promise<{ provider: PushProviderName; invalidated: boolean }> {
    return { provider: "firebase", invalidated: true };
  }

  async validateConfiguration(): Promise<PushConfigurationStatus> {
    const credentials = await this.loadCredentials().catch(() => null);
    const missing = [
      this.env.FIREBASE_PROJECT_ID || credentials?.project_id ? null : "FIREBASE_PROJECT_ID",
      credentials?.client_email ? null : "FIREBASE_CLIENT_EMAIL",
      credentials?.private_key ? null : "FIREBASE_PRIVATE_KEY"
    ].filter((item): item is string => Boolean(item));
    return { provider: "firebase", configured: missing.length === 0, missing };
  }

  private async sendFcm(payload: PushPayload): Promise<PushResult> {
    const status = await this.validateConfiguration();
    if (!status.configured) {
      throw new Error(`Firebase push is not configured: ${status.missing.join(", ")}`);
    }
    if (!payload.token) {
      throw new Error("FCM token is required to send a Firebase push notification");
    }
    const credentials = await this.loadCredentials();
    const projectId = this.env.FIREBASE_PROJECT_ID ?? credentials.project_id;
    const token = await this.getAccessToken(credentials);
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        message: {
          token: payload.token,
          notification: {
            title: payload.title,
            body: payload.body
          },
          data: buildSafeNotificationData(payload),
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "lesson-reminders",
              click_action: "OPEN_LESSON_READY"
            }
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                sound: "default",
                category: "LESSON_REMINDER"
              }
            }
          }
        }
      })
    });
    const json = (await response.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(json.error?.message ?? `Firebase push failed with HTTP ${response.status}`);
    }
    return { provider: "firebase", externalId: json.name ?? `firebase-${payload.occurrenceId}`, sentAt: new Date().toISOString() };
  }

  private async getAccessToken(credentials: FirebaseCredentials): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && this.accessToken.expiresAt - 60 > now) return this.accessToken.value;
    const assertion = signJwt({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    }, credentials.private_key);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    });
    const json = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!response.ok || !json.access_token) {
      throw new Error(json.error_description ?? `Firebase OAuth token request failed with HTTP ${response.status}`);
    }
    this.accessToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
    return json.access_token;
  }

  private async loadCredentials(): Promise<FirebaseCredentials> {
    if (this.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const raw = await readFile(this.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8");
      return JSON.parse(raw) as FirebaseCredentials;
    }
    return {
      project_id: this.env.FIREBASE_PROJECT_ID ?? "",
      client_email: this.env.FIREBASE_CLIENT_EMAIL ?? "",
      private_key: (this.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n")
    };
  }
}

export function createPushProvider(env: NodeJS.ProcessEnv = process.env): PushProvider {
  const explicitMock = env.APP_MODE === "mock" || env.MOCK_PUSH === "true" || env.NODE_ENV === "test";
  if (explicitMock) return new MockPushProvider(env);
  const firebaseConfigured = Boolean(env.FIREBASE_PROJECT_ID || env.GOOGLE_APPLICATION_CREDENTIALS);
  if (firebaseConfigured) return new FirebasePushProvider(env);
  return new DisabledPushProvider();
}

export function buildSafeNotificationData(payload: PushPayload): Record<string, string> {
  const safeExtraData = Object.fromEntries(
    Object.entries(payload.data ?? {}).filter(([key]) => ["scheduledAt", "deepLink", "source"].includes(key))
  );
  return {
    occurrenceId: payload.occurrenceId,
    notificationDeliveryId: payload.notificationDeliveryId ?? "",
    notificationType: payload.notificationType,
    route: "LessonReady",
    ...safeExtraData
  };
}

type FirebaseCredentials = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function signJwt(payload: Record<string, string | number>, privateKey: string): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  signer.end();
  return `${header}.${body}.${signer.sign(privateKey, "base64url")}`;
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}
