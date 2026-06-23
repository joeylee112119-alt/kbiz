export const cefrLevels = ["A1", "A2", "B1", "B2"] as const;
export type CefrLevel = (typeof cefrLevels)[number];

export const englishVariants = ["AMERICAN", "BRITISH"] as const;
export type EnglishVariant = (typeof englishVariants)[number];

export const learnerGoals = [
  "TRAVEL",
  "DAILY_CONVERSATION",
  "WORK_ENGLISH",
  "INTERVIEW",
  "STUDY_ABROAD",
  "TEST",
  "FREE_TALK"
] as const;
export type LearnerGoal = (typeof learnerGoals)[number];

export const difficultyAreas = [
  "VOCAB_RECALL",
  "GRAMMAR",
  "PRONUNCIATION",
  "LISTENING",
  "NERVOUSNESS",
  "SENTENCE_LINKING",
  "KEEPING_CONVERSATION"
] as const;
export type DifficultyArea = (typeof difficultyAreas)[number];

export const correctionPreferences = [
  "IMMEDIATE_IMPORTANT_ONLY",
  "AFTER_ACTIVITY",
  "END_OF_LESSON"
] as const;
export type CorrectionPreference = (typeof correctionPreferences)[number];

export const appStates = [
  "ONBOARDING",
  "TRIAL_READY",
  "TRIAL_LESSON",
  "TRIAL_RESULT",
  "SUBSCRIPTION",
  "HOME",
  "LESSON_SCHEDULED",
  "LESSON_READY",
  "LESSON_ACTIVE",
  "LESSON_FINISHING",
  "RESULT_GENERATING",
  "RESULT",
  "REVIEW"
] as const;
export type AppState = (typeof appStates)[number];

export const lessonStages = [
  "CHECK_IN",
  "WARM_UP",
  "TARGET_PHRASES",
  "GUIDED_ROLEPLAY",
  "FREE_TALK",
  "CORRECTION",
  "WRAP_UP",
  "COMPLETED"
] as const;
export type LessonStage = (typeof lessonStages)[number];

export const lessonOccurrenceStatuses = [
  "SCHEDULED",
  "NOTIFICATION_PENDING",
  "NOTIFIED",
  "READY",
  "SNOOZED",
  "STARTING",
  "ACTIVE",
  "COMPLETED",
  "SKIPPED",
  "MISSED",
  "CANCELLED",
  "EXPIRED",
  "FAILED"
] as const;
export type LessonOccurrenceStatus = (typeof lessonOccurrenceStatuses)[number];

export const notificationDeliveryStatuses = ["PENDING", "SENT", "OPENED", "ACTIONED", "FAILED", "EXPIRED"] as const;
export type NotificationDeliveryStatus = (typeof notificationDeliveryStatuses)[number];

export const notificationTypes = ["LESSON_PRE_REMINDER", "LESSON_REMINDER", "LESSON_SNOOZE_REMINDER", "REPORT_READY"] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const realtimeConnectionStates = [
  "IDLE",
  "TOKEN_LOADING",
  "PEER_CREATING",
  "OFFER_CREATED",
  "CONNECTING",
  "CONNECTED",
  "RECONNECTING",
  "DISCONNECTED",
  "FAILED",
  "CLOSED"
] as const;
export type RealtimeConnectionState = (typeof realtimeConnectionStates)[number];

export const reviewStates = ["NEW", "LEARNING", "REVIEWING", "MASTERED"] as const;
export type ReviewState = (typeof reviewStates)[number];

export const adminRoles = ["SUPER_ADMIN", "CONTENT_MANAGER", "SUPPORT", "ANALYST"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const entitlementStates = ["FREE", "TRIAL", "PREMIUM", "EXPIRED"] as const;
export type EntitlementState = (typeof entitlementStates)[number];

export const errorCodes = [
  "AUTH_REQUIRED",
  "VALIDATION_FAILED",
  "OCCURRENCE_ALREADY_STARTED",
  "OCCURRENCE_EXPIRED",
  "OCCURRENCE_NOT_FOUND",
  "LESSON_NOT_FOUND",
  "REALTIME_SESSION_FAILED",
  "RATE_LIMITED",
  "IDEMPOTENCY_CONFLICT",
  "ADMIN_FORBIDDEN"
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export type ApiErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details: Record<string, unknown>;
  };
};

export type ApiEnvelope<T> = {
  data: T;
  requestId: string;
};

export type LearnerProfile = {
  level: CefrLevel;
  englishVariant: EnglishVariant;
  goals: LearnerGoal[];
  difficultAreas: DifficultyArea[];
  correctionPreference: CorrectionPreference;
  interests: string[];
  dailyStudyMinutes: number;
  timezone: string;
};

export type Tutor = {
  id: string;
  name: string;
  personaKo: string;
  imageUrl: string;
  defaultVoiceId: string;
};

export type LessonScheduleRequest = {
  daysOfWeek: number[];
  localTime: string;
  timezone: string;
  durationMinutes: number;
  preReminderMinutes?: number | null;
  enabled?: boolean;
};

export type LessonOccurrence = {
  id: string;
  scheduleId: string | null;
  status: LessonOccurrenceStatus;
  scheduledAt: string;
  availableFrom: string;
  expiresAt: string;
  tutorId: string;
  lessonTemplateId: string;
  topicKo: string;
};

export type LessonStageState = {
  stageId: string;
  stage: LessonStage;
  startedAt: string;
  plannedEndAt: string;
  actualEndAt: string | null;
  objective: string;
  completionConditions: string[];
  materialCardIds: string[];
  targetExpressions: TargetExpression[];
  correctionPolicy: CorrectionPreference;
  backchannelPolicy: BackchannelPolicy;
  promptVersion: string;
};

export type TargetExpression = {
  id: string;
  text: string;
  meaningKo: string;
  examples: string[];
  alternatives: string[];
  level: CefrLevel;
  grammarTags: string[];
  used?: boolean;
};

export type BackchannelPolicy = {
  enabled: boolean;
  minSpeechMs: number;
  minGapMs: number;
  maxPerTurn: number;
  disallowedStages: LessonStage[];
};

export type Correction = {
  originalText: string;
  correctedText: string;
  explanationKo: string;
  category: "MEANING" | "GRAMMAR" | "VOCABULARY" | "PRONUNCIATION" | "PRAGMATICS";
  severity: "LOW" | "MEDIUM" | "HIGH";
  stage: LessonStage;
  timestamp: string;
  repeatedCount: number;
  selectedForReport: boolean;
};

export type LessonReport = {
  summary: string;
  goalAchievementScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  pronunciationScore: number | null;
  userSpeakingRatio: number;
  targetExpressions: TargetExpression[];
  goodExpressions: string[];
  corrections: Correction[];
  newVocabulary: string[];
  reviewItems: string[];
  nextLessonRecommendation: {
    lessonTemplateSlug: string;
    reasonKo: string;
  };
  confidence: Record<string, number>;
};

export const websocketEventTypes = [
  "lesson_schedule.created",
  "lesson_schedule.updated",
  "lesson_occurrence.created",
  "lesson_pre_reminder.sent",
  "lesson_reminder.sent",
  "lesson_reminder.opened",
  "lesson_ready.viewed",
  "lesson.snoozed",
  "lesson.skipped",
  "lesson.missed",
  "lesson_start.clicked",
  "realtime.connecting",
  "realtime.connected",
  "realtime.reconnecting",
  "realtime.failed",
  "lesson.started",
  "lesson.stage.changed",
  "lesson.material.show",
  "lesson.correction.created",
  "lesson.timer.synced",
  "transcript.partial",
  "transcript.final",
  "backchannel.played",
  "lesson.finishing",
  "lesson.completed",
  "report.generating",
  "report.ready"
] as const;
export type WebsocketEventType = (typeof websocketEventTypes)[number];

export type WebsocketEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  sequence: number;
  version: 1;
  type: WebsocketEventType;
  occurredAt: string;
  sessionId: string | null;
  payload: TPayload;
};

export const openAiRealtimeServerEvents = [
  "session.created",
  "session.updated",
  "input_audio_buffer.speech_started",
  "input_audio_buffer.speech_stopped",
  "conversation.item.created",
  "conversation.item.truncated",
  "conversation.item.deleted",
  "response.created",
  "response.output_audio.delta",
  "response.output_audio.done",
  "response.output_audio_transcript.delta",
  "response.output_audio_transcript.done",
  "response.done",
  "error"
] as const;
export type OpenAiRealtimeServerEvent = (typeof openAiRealtimeServerEvents)[number];

export function createEvent<TPayload extends Record<string, unknown>>(input: {
  id: string;
  sequence: number;
  type: WebsocketEventType;
  sessionId?: string | null;
  payload: TPayload;
  occurredAt?: string;
}): WebsocketEvent<TPayload> {
  return {
    id: input.id,
    sequence: input.sequence,
    version: 1,
    type: input.type,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    sessionId: input.sessionId ?? null,
    payload: input.payload
  };
}

export function assertScore(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${name} must be a 0-100 score`);
  }
}

export function validateLessonReport(report: LessonReport): LessonReport {
  assertScore("goalAchievementScore", report.goalAchievementScore);
  assertScore("fluencyScore", report.fluencyScore);
  assertScore("grammarScore", report.grammarScore);
  assertScore("vocabularyScore", report.vocabularyScore);
  if (report.pronunciationScore !== null) {
    assertScore("pronunciationScore", report.pronunciationScore);
  }
  assertScore("userSpeakingRatio", report.userSpeakingRatio * 100);
  return report;
}

export const onboardingOptions = {
  levels: [
    { id: "A1", labelKo: "A1 입문" },
    { id: "A2", labelKo: "A2 초급" },
    { id: "B1", labelKo: "B1 중급" },
    { id: "B2", labelKo: "B2 중상급" }
  ],
  goals: [
    { id: "TRAVEL", labelKo: "여행" },
    { id: "DAILY_CONVERSATION", labelKo: "일상 대화" },
    { id: "WORK_ENGLISH", labelKo: "직장 영어" },
    { id: "INTERVIEW", labelKo: "면접" },
    { id: "STUDY_ABROAD", labelKo: "유학" },
    { id: "TEST", labelKo: "시험" },
    { id: "FREE_TALK", labelKo: "자유 대화" }
  ],
  correctionPreferences: [
    { id: "IMMEDIATE_IMPORTANT_ONLY", labelKo: "중요한 오류만 바로 교정" },
    { id: "AFTER_ACTIVITY", labelKo: "활동 종료 후 교정" },
    { id: "END_OF_LESSON", labelKo: "수업 종료 후 한 번에 교정" }
  ]
} as const;
