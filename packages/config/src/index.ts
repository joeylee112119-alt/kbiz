export type AppConfig = {
  nodeEnv: string;
  appMode: string;
  apiPort: number;
  databaseUrl: string;
  redisUrl: string;
  openAiRealtimeModel: string;
  openAiRealtimeVoice: string;
  openAiAnalysisModel: string;
  mockRealtime: boolean;
  mockPush: boolean;
  mockBilling: boolean;
  mockPronunciation: boolean;
  allowMocksInProduction: boolean;
  lessonTimeScale: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    appMode: env.APP_MODE ?? "standard",
    apiPort: Number(env.API_PORT ?? "4000"),
    databaseUrl: env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/aiphone",
    redisUrl: env.REDIS_URL ?? "redis://localhost:6379",
    openAiRealtimeModel: env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2",
    openAiRealtimeVoice: env.OPENAI_REALTIME_VOICE ?? "marin",
    openAiAnalysisModel: env.OPENAI_ANALYSIS_MODEL ?? "gpt-5.5-mini",
    mockRealtime: env.MOCK_REALTIME !== "false",
    mockPush: env.MOCK_PUSH !== "false",
    mockBilling: env.MOCK_BILLING !== "false",
    mockPronunciation: env.MOCK_PRONUNCIATION !== "false",
    allowMocksInProduction: env.ALLOW_MOCKS_IN_PRODUCTION === "true",
    lessonTimeScale: Number(env.LESSON_TIME_SCALE ?? "0.02")
  };
}

export function assertProductionSafety(config: AppConfig): void {
  if (config.nodeEnv === "production" && config.lessonTimeScale !== 1) {
    throw new Error("LESSON_TIME_SCALE must be 1 in production");
  }
  if (config.nodeEnv !== "production" || config.allowMocksInProduction) return;
  const unsafeMockFlags = [
    ["MOCK_REALTIME", config.mockRealtime],
    ["MOCK_PUSH", config.mockPush],
    ["MOCK_BILLING", config.mockBilling],
    ["MOCK_PRONUNCIATION", config.mockPronunciation]
  ].filter(([, enabled]) => enabled);
  if (unsafeMockFlags.length > 0) {
    throw new Error(
      `Production startup refused because mock providers are enabled: ${unsafeMockFlags
        .map(([name]) => name)
        .join(", ")}. Set all mock flags to false or explicitly set ALLOW_MOCKS_IN_PRODUCTION=true for an isolated non-customer environment.`
    );
  }
}
