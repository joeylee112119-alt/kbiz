import { FirebasePushProvider } from "../packages/notification/src/index.ts";

const required = ["TEST_FCM_TOKEN"] as const;
const missing = required.filter((key) => !process.env[key]);
const hasFirebaseCredentials = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
);

if (missing.length > 0 || !hasFirebaseCredentials) {
  const credentialMessage = hasFirebaseCredentials ? [] : ["GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY"];
  process.stderr.write(`SKIP firebase push smoke: missing ${[...missing, ...credentialMessage].join(", ")}\n`);
  process.exit(77);
}

const provider = new FirebasePushProvider(process.env);
const status = await provider.validateConfiguration();
if (!status.configured) {
  process.stderr.write(`SKIP firebase push smoke: missing ${status.missing.join(", ")}\n`);
  process.exit(77);
}

const result = await provider.sendTestNotification({
  occurrenceId: `smoke-${Date.now()}`,
  notificationDeliveryId: `smoke-delivery-${Date.now()}`,
  notificationType: "LESSON_REMINDER",
  token: process.env.TEST_FCM_TOKEN,
  title: "AI 영어 수업 smoke test",
  body: "Firebase production push path smoke test",
  data: { source: "firebase-push-smoke" }
});

process.stdout.write(JSON.stringify({ ok: true, result }, null, 2));
process.stdout.write("\n");
