import { ProductionRealtimeProvider } from "../packages/realtime-client/src/index.ts";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("SKIP: OPENAI_API_KEY is not set. Production Realtime smoke was not executed.");
  process.exit(77);
}

const provider = new ProductionRealtimeProvider();
const result = await provider.createClientSecret(
  {
    lessonSessionId: `smoke-${Date.now()}`,
    deviceId: "smoke-device",
    mode: "openai_ephemeral_secret"
  },
  {
    apiKey,
    realtimeModel: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2",
    realtimeVoice: process.env.OPENAI_REALTIME_VOICE ?? "marin",
    safetyIdentifier: "smoke-test-user"
  }
);

console.log(JSON.stringify({ mode: result.mode, expiresAt: result.expiresAt, clientSecretPresent: result.clientSecret.length > 0 }));
