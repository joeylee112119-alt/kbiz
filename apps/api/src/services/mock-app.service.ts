import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { CallAttempt, CallScheduleRequest, LessonReport, LearnerProfile, Tutor } from "@aiphone/contracts";
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
  private schedules = new Map<string, CallScheduleRequest & { id: string; userId: string; nextRunAt: string }>();
  private calls = new Map<string, CallAttempt>();
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
    },
    {
      id: "tutor-noah",
      name: "Noah",
      personaKo: "따뜻하게 질문을 이어가는 영국식 영어 튜터",
      imageUrl: "/assets/tutors/noah.png",
      defaultVoiceId: "cedar"
    }
  ];

  createGuest(): { user: UserRecord; accessToken: string; refreshToken: string } {
    const id = randomUUID();
    const user = { id, displayName: "Guest Learner", appState: "ONBOARDING", profile: null };
    this.users.set(id, user);
    return {
      user,
      accessToken: `mock-access-${id}`,
      refreshToken: `mock-refresh-${id}`
    };
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

  createSchedule(userId: string, request: CallScheduleRequest): Record<string, unknown> {
    this.ensureUser(userId);
    const id = randomUUID();
    const nextRunAt = this.computeNextRunAt(request.localTime, request.timezone);
    const schedule = { ...request, id, userId, nextRunAt };
    this.schedules.set(id, schedule);
    return schedule;
  }

  startNow(userId: string): CallAttempt {
    this.ensureUser(userId);
    const now = new Date();
    const call: CallAttempt = {
      id: randomUUID(),
      scheduleId: null,
      status: "RINGING",
      startsAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 45_000).toISOString(),
      tutorId: "tutor-emma",
      topicKo: "호텔 체크인",
      iosCallKitUuid: randomUUID(),
      androidCallId: randomUUID()
    };
    this.calls.set(call.id, call);
    return call;
  }

  acceptCall(callId: string): Record<string, unknown> {
    const call = this.ensureCall(callId);
    if (new Date(call.expiresAt).getTime() < Date.now()) {
      call.status = "EXPIRED";
      return { call, error: "CALL_EXPIRED" };
    }
    call.status = "ACCEPTED";
    const lessonSessionId = randomUUID();
    this.sessions.set(lessonSessionId, this.createOrchestrator(lessonSessionId));
    return { call, lessonSessionId };
  }

  declineCall(callId: string): CallAttempt {
    const call = this.ensureCall(callId);
    call.status = "DECLINED";
    return call;
  }

  snoozeCall(callId: string): CallAttempt {
    const call = this.ensureCall(callId);
    call.status = "SNOOZED";
    call.startsAt = new Date(Date.now() + 10 * 60_000).toISOString();
    call.expiresAt = new Date(Date.now() + 10 * 60_000 + 45_000).toISOString();
    return call;
  }

  createRealtimeSession(lessonSessionId: string, deviceId: string, localSdp?: string): Record<string, unknown> {
    if (process.env.MOCK_REALTIME !== "false") {
      return { mode: "mock", sessionId: lessonSessionId, deviceId, dataChannelName: "mock-oai-events" };
    }
    if (localSdp) {
      return { mode: "openai_unified_sdp", sessionId: lessonSessionId, sdpAnswer: "PROVIDED_BY_OPENAI_BACKEND" };
    }
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
    const orchestrator = this.ensureSession(lessonSessionId);
    return orchestrator.getState();
  }

  advanceLessonStage(lessonSessionId: string): Record<string, unknown> {
    const orchestrator = this.ensureSession(lessonSessionId);
    const decision = orchestrator.advanceStage("e2e_stage_transition");
    return { decision, state: orchestrator.getState() };
  }

  recordTranscriptEvent(lessonSessionId: string, transcript: string): Record<string, unknown> {
    const orchestrator = this.ensureSession(lessonSessionId);
    const state = orchestrator.recordUtterance({
      speaker: "USER",
      transcript,
      durationMs: 1500,
      at: new Date().toISOString()
    });
    return { accepted: true, state };
  }

  finishLessonSession(lessonSessionId: string): Record<string, unknown> {
    const orchestrator = this.ensureSession(lessonSessionId);
    return orchestrator.finishLesson("e2e_finish");
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
    return {
      dailyActiveUsers: this.users.size,
      scheduledCalls: this.schedules.size,
      missedCalls: [...this.calls.values()].filter((call) => call.status === "MISSED").length,
      callAnswerRate: 0.78,
      lessonCompletionRate: 0.71,
      averageUserSpeakingRatio: 0.63,
      realtimeErrorRate: 0.01
    };
  }

  private ensureUser(userId: string): UserRecord {
    const user = this.users.get(userId);
    if (user) return user;
    const created = { id: userId, displayName: "Guest Learner", appState: "ONBOARDING", profile: null };
    this.users.set(userId, created);
    return created;
  }

  private ensureCall(callId: string): CallAttempt {
    const call = this.calls.get(callId);
    if (!call) {
      throw new Error("CALL_NOT_FOUND");
    }
    return call;
  }

  private computeNextRunAt(localTime: string, _timezone: string): string {
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
