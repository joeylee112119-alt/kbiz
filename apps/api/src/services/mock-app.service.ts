import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { LessonOccurrence, LessonReport, LessonScheduleRequest, LearnerProfile, Tutor } from "@aiphone/contracts";
import { onboardingOptions, validateLessonReport } from "@aiphone/contracts";
import { LessonOrchestrator, defaultStageDurations } from "@aiphone/lesson-engine";
import { buildRealtimeSessionUpdate } from "@aiphone/realtime-client";

type UserRecord = {
  id: string;
  displayName: string;
  appState: string;
  profile: LearnerProfile | null;
};

@Injectable()
export class MockAppService {
  private users = new Map<string, UserRecord>();
  private schedules = new Map<string, LessonScheduleRequest & { id: string; userId: string; nextRunAt: string }>();
  private occurrences = new Map<string, LessonOccurrence>();
  private sessions = new Map<string, LessonOrchestrator>();
  private reports = new Map<string, LessonReport>();
  private reviewItems = new Map<string, Array<Record<string, unknown>>>();

  readonly tutors: Tutor[] = [
    {
      id: "tutor-emma",
      name: "Emma",
      personaKo: "차분하고 명확하게 말해주는 미국식 영어 튜터",
      imageUrl: "/assets/tutors/emma.png",
      defaultVoiceId: "marin"
    }
  ];

  createGuest(): { user: UserRecord; accessToken: string; refreshToken: string } {
    const id = randomUUID();
    const user = { id, displayName: "Guest Learner", appState: "ONBOARDING", profile: null };
    this.users.set(id, user);
    return { user, accessToken: `mock-access-${id}`, refreshToken: `mock-refresh-${id}` };
  }

  getOptions(): typeof onboardingOptions {
    return onboardingOptions;
  }

  saveProfile(userId: string, profile: LearnerProfile): UserRecord {
    const user = this.ensureUser(userId);
    user.profile = profile;
    user.appState = "TRIAL_READY";
    return user;
  }

  createSchedule(userId: string, request: LessonScheduleRequest): Record<string, unknown> {
    this.ensureUser(userId);
    const id = randomUUID();
    const nextRunAt = this.computeNextRunAt(request.localTime);
    const schedule = { ...request, id, userId, nextRunAt };
    this.schedules.set(id, schedule);
    const occurrence = this.createOccurrence(userId, id, nextRunAt);
    return { ...schedule, occurrence };
  }

  startNowOccurrence(userId: string): LessonOccurrence {
    this.ensureUser(userId);
    return this.createOccurrence(userId, null, new Date().toISOString(), "READY");
  }

  openOccurrence(occurrenceId: string): LessonOccurrence {
    const occurrence = this.ensureOccurrence(occurrenceId);
    occurrence.status = "READY";
    return occurrence;
  }

  startOccurrence(occurrenceId: string): Record<string, unknown> {
    const occurrence = this.ensureOccurrence(occurrenceId);
    occurrence.status = "STARTING";
    const lessonSessionId = randomUUID();
    this.sessions.set(lessonSessionId, this.createOrchestrator(lessonSessionId));
    return { occurrence, lessonSessionId };
  }

  snoozeOccurrence(occurrenceId: string): LessonOccurrence {
    const occurrence = this.ensureOccurrence(occurrenceId);
    occurrence.status = "SNOOZED";
    return occurrence;
  }

  skipOccurrence(occurrenceId: string): LessonOccurrence {
    const occurrence = this.ensureOccurrence(occurrenceId);
    occurrence.status = "SKIPPED";
    return occurrence;
  }

  createRealtimeSession(lessonSessionId: string, deviceId: string, localSdp?: string): Record<string, unknown> {
    if (process.env.MOCK_REALTIME !== "false") {
      return { mode: "mock", sessionId: lessonSessionId, deviceId, dataChannelName: "mock-oai-events" };
    }
    if (localSdp) return { mode: "openai_unified_sdp", sessionId: lessonSessionId, sdpAnswer: "PROVIDED_BY_OPENAI_BACKEND" };
    return { mode: "openai_ephemeral_secret", sessionId: lessonSessionId, clientSecret: "SERVER_MINTED_ONLY", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  }

  getRealtimeDefaults(): Record<string, unknown> {
    return buildRealtimeSessionUpdate(process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2", process.env.OPENAI_REALTIME_VOICE ?? "marin");
  }

  todayLesson(): Record<string, unknown> {
    return {
      topicKo: "호텔 체크인",
      durationSeconds: 900,
      scaledDurationSeconds: Math.round(900 * Number(process.env.LESSON_TIME_SCALE ?? "0.02")),
      stages: defaultStageDurations
    };
  }

  generateReport(lessonSessionId: string): LessonReport {
    const report = validateLessonReport({
      summary: "호텔 체크인 상황에서 예약 확인과 요청 표현을 연습했습니다.",
      goalAchievementScore: 82,
      fluencyScore: 76,
      grammarScore: 74,
      vocabularyScore: 80,
      pronunciationScore: null,
      userSpeakingRatio: 0.63,
      targetExpressions: [],
      goodExpressions: ["I'd like to check in.", "Could I get a quiet room?"],
      corrections: [],
      newVocabulary: ["reservation", "confirmation", "quiet room"],
      reviewItems: ["Could I get a quiet room?"],
      nextLessonRecommendation: {
        lessonTemplateSlug: "phone-reservation-a2",
        reasonKo: "전화 예약 표현으로 자연스럽게 확장할 수 있습니다."
      },
      confidence: { transcriptCoverage: 0.82 }
    });
    this.reports.set(lessonSessionId, report);
    return report;
  }

  retrieveReport(lessonSessionId: string): LessonReport {
    return this.reports.get(lessonSessionId) ?? this.generateReport(lessonSessionId);
  }

  startLessonSession(lessonSessionId: string): Record<string, unknown> {
    return this.ensureSession(lessonSessionId).getState();
  }

  advanceLessonStage(lessonSessionId: string): Record<string, unknown> {
    const orchestrator = this.ensureSession(lessonSessionId);
    const decision = orchestrator.advanceStage("e2e_stage_transition");
    return { decision, state: orchestrator.getState() };
  }

  recordTranscriptEvent(lessonSessionId: string, transcript: string): Record<string, unknown> {
    const state = this.ensureSession(lessonSessionId).recordUtterance({
      speaker: "USER",
      transcript,
      durationMs: 1500,
      at: new Date().toISOString()
    });
    return { accepted: true, state };
  }

  finishLessonSession(lessonSessionId: string): Record<string, unknown> {
    return this.ensureSession(lessonSessionId).finishLesson("e2e_finish");
  }

  generateReviewItems(lessonSessionId: string): Array<Record<string, unknown>> {
    const report = this.retrieveReport(lessonSessionId);
    const items = report.reviewItems.map((prompt, index) => ({
      id: `review-${lessonSessionId}-${index + 1}`,
      prompt,
      status: "NEW",
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString()
    }));
    this.reviewItems.set(lessonSessionId, items);
    return items;
  }

  listAdminMetrics(): Record<string, number> {
    const missed = [...this.occurrences.values()].filter((occurrence) => occurrence.status === "MISSED").length;
    const started = [...this.occurrences.values()].filter((occurrence) => occurrence.status === "STARTING" || occurrence.status === "ACTIVE" || occurrence.status === "COMPLETED").length;
    return {
      dailyActiveUsers: this.users.size,
      scheduledLessons: this.schedules.size,
      pushSent: 0,
      reminderOpened: 0,
      readyViews: [...this.occurrences.values()].filter((occurrence) => occurrence.status === "READY").length,
      lessonStarted: started,
      lessonCompletionRate: 0.71,
      notificationClickRate: 0,
      clickToLessonStartRate: 0,
      completionRate: 0,
      snoozeRate: 0,
      skipRate: 0,
      missedRate: missed,
      averageUserSpeakingRatio: 0.63,
      realtimeErrorRate: 0.01
    };
  }

  private createOccurrence(userId: string, scheduleId: string | null, scheduledAtIso: string, status: LessonOccurrence["status"] = "SCHEDULED"): LessonOccurrence {
    const scheduledAt = new Date(scheduledAtIso);
    const occurrence: LessonOccurrence = {
      id: randomUUID(),
      scheduleId,
      status,
      scheduledAt: scheduledAt.toISOString(),
      availableFrom: new Date(scheduledAt.getTime() - 10 * 60_000).toISOString(),
      expiresAt: new Date(scheduledAt.getTime() + 30 * 60_000).toISOString(),
      tutorId: "tutor-emma",
      lessonTemplateId: "hotel-checkin-a1",
      topicKo: "호텔 체크인"
    };
    this.ensureUser(userId).appState = status === "READY" ? "LESSON_READY" : "LESSON_SCHEDULED";
    this.occurrences.set(occurrence.id, occurrence);
    return occurrence;
  }

  private ensureUser(userId: string): UserRecord {
    const user = this.users.get(userId);
    if (user) return user;
    const created = { id: userId, displayName: "Guest Learner", appState: "ONBOARDING", profile: null };
    this.users.set(userId, created);
    return created;
  }

  private ensureOccurrence(occurrenceId: string): LessonOccurrence {
    const occurrence = this.occurrences.get(occurrenceId);
    if (!occurrence) throw new Error("OCCURRENCE_NOT_FOUND");
    return occurrence;
  }

  private computeNextRunAt(localTime: string): string {
    const [hour = "20", minute = "30"] = localTime.split(":");
    const next = new Date();
    next.setUTCHours(Number(hour) - 9, Number(minute), 0, 0);
    if (next.getTime() < Date.now()) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }

  createOrchestrator(sessionId: string): LessonOrchestrator {
    return new LessonOrchestrator({
      sessionId,
      startedAt: new Date().toISOString(),
      timeScale: Number(process.env.LESSON_TIME_SCALE ?? "0.02"),
      objective: "호텔 체크인에서 예약 확인과 객실 요청하기",
      targetExpressions: [
        {
          id: "expr-check-in",
          text: "I'd like to check in",
          meaningKo: "체크인하고 싶습니다",
          examples: ["I'd like to check in, please."],
          alternatives: ["I want to check in."],
          level: "A1",
          grammarTags: ["request"]
        }
      ],
      backchannelPolicy: {
        enabled: true,
        minSpeechMs: 1800,
        minGapMs: 4500,
        maxPerTurn: 2,
        disallowedStages: ["TARGET_PHRASES", "CORRECTION"]
      }
    });
  }

  private ensureSession(lessonSessionId: string): LessonOrchestrator {
    const existing = this.sessions.get(lessonSessionId);
    if (existing) return existing;
    const created = this.createOrchestrator(lessonSessionId);
    this.sessions.set(lessonSessionId, created);
    return created;
  }
}
