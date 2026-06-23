export type AppConfig = {
  nodeEnv: string;
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
  lessonTimeScale: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
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
    lessonTimeScale: Number(env.LESSON_TIME_SCALE ?? "0.02")
  };
}

export function assertProductionSafety(config: AppConfig): void {
  if (config.nodeEnv === "production" && config.lessonTimeScale !== 1) {
    throw new Error("LESSON_TIME_SCALE must be 1 in production");
  }
}
