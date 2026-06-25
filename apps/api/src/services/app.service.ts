import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { LessonScheduleRequest, LearnerProfile } from "@aiphone/contracts";
import { onboardingOptions, validateLessonReport } from "@aiphone/contracts";
import { defaultStageDurations } from "@aiphone/lesson-engine";
import { buildRealtimeSessionUpdate } from "@aiphone/realtime-client";
import { PrismaService } from "./prisma.service.js";

const DEFAULT_TUTOR_ID = "00000000-0000-4000-8000-000000000001";
const LESSON_STAGE_ORDER = [
  "CHECK_IN",
  "WARM_UP",
  "TARGET_PHRASES",
  "GUIDED_ROLEPLAY",
  "FREE_TALK",
  "CORRECTION",
  "WRAP_UP",
  "COMPLETED"
] as const;

type LessonStage = (typeof LESSON_STAGE_ORDER)[number];

@Injectable()
export class AppService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createGuest(): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.create({
      data: {
        displayName: "Guest Learner",
        appState: "ONBOARDING",
        timezone: "Asia/Seoul",
        locale: "ko-KR"
      }
    });
    const refreshToken = `refresh-${randomUUID()}`;
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000)
      }
    });
    return {
      user: serializeUser(user),
      accessToken: `access-${user.id}-${randomUUID()}`,
      refreshToken
    };
  }

  getOptions(): typeof onboardingOptions {
    return onboardingOptions;
  }

  async saveProfile(userId: string, profile: LearnerProfile): Promise<Record<string, unknown>> {
    const tutor = await this.ensureTutor();
    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          appState: "TRIAL_READY",
          timezone: profile.timezone,
          learnerProfile: {
            upsert: {
              update: {
                level: profile.level,
                englishVariant: profile.englishVariant,
                goals: profile.goals,
                difficultAreas: profile.difficultAreas,
                correctionPreference: profile.correctionPreference,
                interests: profile.interests,
                dailyStudyMinutes: profile.dailyStudyMinutes,
                tutorId: tutor.id
              },
              create: {
                level: profile.level,
                englishVariant: profile.englishVariant,
                goals: profile.goals,
                difficultAreas: profile.difficultAreas,
                correctionPreference: profile.correctionPreference,
                interests: profile.interests,
                dailyStudyMinutes: profile.dailyStudyMinutes,
                tutorId: tutor.id
              }
            }
          }
        }
      });
      return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { learnerProfile: true } });
    });
    return serializeUser(saved);
  }

  async completeOnboarding(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { appState: "TRIAL_READY" } });
    return serializeUser(user);
  }

  async createSchedule(userId: string, request: LessonScheduleRequest): Promise<Record<string, unknown>> {
    await this.ensureUser(userId);
    const tutor = await this.ensureTutor();
    const schedule = await this.prisma.lessonSchedule.create({
      data: {
        userId,
        tutorId: tutor.id,
        daysOfWeek: request.daysOfWeek,
        localTime: request.localTime,
        timezone: request.timezone,
        durationMinutes: request.durationMinutes,
        preReminderMinutes: request.preReminderMinutes ?? 10,
        enabled: request.enabled ?? true,
        nextRunAt: computeNextRunAt(request.localTime)
      }
    });
    const occurrence = await this.materializeOccurrence(schedule.id);
    await this.prisma.user.update({ where: { id: userId }, data: { appState: "LESSON_SCHEDULED" } });
    await this.createOutbox("LessonSchedule", schedule.id, "lesson_schedule.created", { schedule, occurrence }, schedule.id);
    return serializeSchedule(schedule);
  }

  async listSchedules(userId?: string): Promise<Array<Record<string, unknown>>> {
    const schedules = await this.prisma.lessonSchedule.findMany({
      where: { ...(userId ? { userId } : {}) },
      orderBy: { createdAt: "desc" }
    });
    return schedules.map(serializeSchedule);
  }

  async getSchedule(id: string): Promise<Record<string, unknown>> {
    return serializeSchedule(await this.prisma.lessonSchedule.findUniqueOrThrow({ where: { id } }));
  }

  async updateSchedule(id: string, body: Partial<LessonScheduleRequest>): Promise<Record<string, unknown>> {
    const schedule = await this.prisma.lessonSchedule.update({
      where: { id },
      data: pruneUndefined({
        daysOfWeek: body.daysOfWeek,
        localTime: body.localTime,
        timezone: body.timezone,
        durationMinutes: body.durationMinutes,
        preReminderMinutes: body.preReminderMinutes,
        enabled: body.enabled,
        nextRunAt: body.localTime ? computeNextRunAt(body.localTime) : undefined,
      })
    });
    await this.createOutbox("LessonSchedule", schedule.id, "lesson_schedule.updated", schedule, `schedule-updated:${schedule.id}:${schedule.updatedAt.toISOString()}`);
    return serializeSchedule(schedule);
  }

  async pauseSchedule(id: string): Promise<Record<string, unknown>> {
    const schedule = await this.prisma.lessonSchedule.update({ where: { id }, data: { enabled: false } });
    return serializeSchedule(schedule);
  }

  async resumeSchedule(id: string): Promise<Record<string, unknown>> {
    const schedule = await this.prisma.lessonSchedule.update({ where: { id }, data: { enabled: true } });
    await this.materializeOccurrence(schedule.id);
    return serializeSchedule(schedule);
  }

  async deleteSchedule(id: string): Promise<Record<string, unknown>> {
    const schedule = await this.prisma.lessonSchedule.update({ where: { id }, data: { enabled: false } });
    return { ...serializeSchedule(schedule), deleted: true };
  }

  async listUpcomingOccurrences(userId?: string): Promise<Array<Record<string, unknown>>> {
    const occurrences = await this.prisma.lessonOccurrence.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: ["SCHEDULED", "NOTIFICATION_PENDING", "NOTIFIED", "READY", "SNOOZED"] }
      },
      include: { lessonTemplate: true, tutor: true },
      orderBy: { scheduledAt: "asc" },
      take: 20
    });
    return occurrences.map(serializeOccurrence);
  }

  async getOccurrence(id: string): Promise<Record<string, unknown>> {
    return serializeOccurrence(await this.prisma.lessonOccurrence.findUniqueOrThrow({ where: { id }, include: { lessonTemplate: true, tutor: true } }));
  }

  async startNowOccurrence(userId: string): Promise<Record<string, unknown>> {
    await this.ensureUser(userId);
    const tutor = await this.ensureTutor();
    const now = new Date();
    const template = await this.findDefaultLessonTemplate();
    const occurrence = await this.prisma.lessonOccurrence.create({
      data: {
        userId,
        tutorId: tutor.id,
        lessonTemplateId: template.id,
        status: "READY",
        scheduledAt: now,
        availableFrom: now,
        expiresAt: new Date(now.getTime() + 30 * 60_000),
        idempotencyKey: `start-now:${userId}:${now.toISOString()}`
      }
    });
    await this.prisma.user.update({ where: { id: userId }, data: { appState: "LESSON_READY" } });
    await this.createOutbox("LessonOccurrence", occurrence.id, "lesson_occurrence.created", occurrence, `occurrence:${occurrence.id}`);
    return serializeOccurrence(occurrence);
  }

  async openOccurrence(id: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const occurrence = await this.prisma.lessonOccurrence.findUnique({ where: { id } });
    if (!occurrence) throw new NotFoundException("OCCURRENCE_NOT_FOUND");
    if (occurrence.expiresAt.getTime() < Date.now()) {
      const expired = await this.prisma.lessonOccurrence.update({ where: { id }, data: { status: "EXPIRED" } });
      return { occurrence: serializeOccurrence(expired), error: "OCCURRENCE_EXPIRED" };
    }
    const opened = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lessonOccurrence.update({
        where: { id },
        data: { status: "READY", version: { increment: 1 } }
      });
      if (body.notificationDeliveryId) {
        await tx.notificationDelivery.updateMany({
          where: { id: String(body.notificationDeliveryId), occurrenceId: id },
          data: { status: "OPENED", openedAt: new Date() }
        });
      }
      await tx.user.update({ where: { id: updated.userId }, data: { appState: "LESSON_READY" } });
      return updated;
    });
    await this.createOutbox("LessonOccurrence", id, "lesson_reminder.opened", { occurrenceId: id }, `occurrence-opened:${id}`);
    return serializeOccurrence(opened);
  }

  async startOccurrence(occurrenceId: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const occurrence = await this.prisma.lessonOccurrence.findUnique({ where: { id: occurrenceId } });
    if (!occurrence) throw new NotFoundException("OCCURRENCE_NOT_FOUND");
    if (occurrence.expiresAt.getTime() < Date.now()) {
      const expired = await this.prisma.lessonOccurrence.update({ where: { id: occurrenceId }, data: { status: "EXPIRED" } });
      return { occurrence: serializeOccurrence(expired), error: "OCCURRENCE_EXPIRED" };
    }
    const tutor = await this.ensureTutor();
    const templateVersion = await this.findDefaultLessonTemplateVersion();
    const started = await this.prisma.$transaction(async (tx) => {
      const updatedOccurrence = await tx.lessonOccurrence.update({
        where: { id: occurrenceId },
        data: { status: "STARTING", startedAt: new Date(), version: { increment: 1 } }
      });
      const session = await tx.lessonSession.upsert({
        where: { occurrenceId },
        update: { state: "CHECK_IN" },
        create: {
          userId: updatedOccurrence.userId,
          occurrenceId,
          tutorId: tutor.id,
          lessonTemplateVersionId: templateVersion?.id ?? null,
          state: "CHECK_IN",
          timeScale: Number(process.env.LESSON_TIME_SCALE ?? "1")
        }
      });
      if (body.notificationDeliveryId) {
        await tx.notificationDelivery.updateMany({
          where: { id: String(body.notificationDeliveryId), occurrenceId },
          data: { status: "ACTIONED", actionedAt: new Date() }
        });
      }
      await tx.user.update({ where: { id: updatedOccurrence.userId }, data: { appState: "LESSON_ACTIVE" } });
      await tx.outboxEvent.upsert({
        where: { idempotencyKey: `lesson-started:${occurrenceId}` },
        update: {},
        create: {
          aggregateType: "LessonOccurrence",
          aggregateId: occurrenceId,
          eventType: "lesson_started",
          payload: { occurrenceId, lessonSessionId: session.id },
          idempotencyKey: `lesson-started:${occurrenceId}`
        }
      });
      return { occurrence: updatedOccurrence, session };
    });
    return { occurrence: serializeOccurrence(started.occurrence), lessonSessionId: started.session.id };
  }

  async snoozeOccurrence(id: string): Promise<Record<string, unknown>> {
    const occurrence = await this.prisma.lessonOccurrence.findUniqueOrThrow({ where: { id } });
    if (occurrence.snoozeCount >= 2) {
      return { ...serializeOccurrence(occurrence), snoozeRejected: true, reason: "MAX_SNOOZE_REACHED" };
    }
    const scheduledAt = new Date(Date.now() + 10 * 60_000);
    const updated = await this.prisma.lessonOccurrence.update({
      where: { id },
      data: {
        status: "SNOOZED",
        snoozeCount: { increment: 1 },
        scheduledAt,
        availableFrom: scheduledAt,
        expiresAt: new Date(scheduledAt.getTime() + 30 * 60_000),
        version: { increment: 1 }
      }
    });
    await this.createOutbox("LessonOccurrence", id, "lesson_snoozed", updated, `snooze:${id}:${updated.snoozeCount}`);
    return serializeOccurrence(updated);
  }

  async skipOccurrence(id: string): Promise<Record<string, unknown>> {
    const occurrence = await this.prisma.lessonOccurrence.update({ where: { id }, data: { status: "SKIPPED", version: { increment: 1 } } });
    await this.createOutbox("LessonOccurrence", id, "lesson_skipped", occurrence, `skip:${id}`);
    return serializeOccurrence(occurrence);
  }

  async dismissOccurrence(id: string): Promise<Record<string, unknown>> {
    const occurrence = await this.prisma.lessonOccurrence.update({ where: { id }, data: { status: "MISSED", version: { increment: 1 } } });
    await this.createOutbox("LessonOccurrence", id, "lesson_missed", occurrence, `dismiss:${id}`);
    return serializeOccurrence(occurrence);
  }

  async createRealtimeSession(lessonSessionId: string, deviceId: string, localSdp?: string): Promise<Record<string, unknown>> {
    await this.prisma.lessonSession.findUniqueOrThrow({ where: { id: lessonSessionId } });
    const explicitMock = process.env.APP_MODE === "mock" || process.env.MOCK_REALTIME === "true" || process.env.NODE_ENV === "test";
    if (explicitMock) {
      return { mode: "mock", sessionId: lessonSessionId, deviceId, dataChannelName: "mock-oai-events" };
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required to create a production realtime session");
    }
    if (localSdp) {
      return { mode: "openai_unified_sdp", sessionId: lessonSessionId, requiresServerExchange: true };
    }
    return { mode: "openai_ephemeral_secret", sessionId: lessonSessionId, requiresServerMintedClientSecret: true };
  }

  getRealtimeDefaults(): Record<string, unknown> {
    return buildRealtimeSessionUpdate(process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2", process.env.OPENAI_REALTIME_VOICE ?? "marin");
  }

  todayLesson(): Record<string, unknown> {
    return {
      topicKo: "호텔 체크인",
      durationSeconds: 900,
      scaledDurationSeconds: Math.round(900 * Number(process.env.LESSON_TIME_SCALE ?? "1")),
      stages: defaultStageDurations
    };
  }

  async getLessonSession(lessonSessionId: string): Promise<Record<string, unknown>> {
    const session = await this.prisma.lessonSession.findUniqueOrThrow({
      where: { id: lessonSessionId },
      include: { stageSessions: { orderBy: { startedAt: "asc" } }, transcriptSegments: true, report: true }
    });
    return serializeLessonSession(session);
  }

  async startLessonSession(lessonSessionId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const session = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lessonSession.update({
        where: { id: lessonSessionId },
        data: {
          state: "CHECK_IN",
          startedAt: now,
          plannedEndAt: new Date(now.getTime() + 900_000)
        }
      });
      await tx.lessonStageSession.create({
        data: {
          lessonSessionId,
          stageType: "CHECK_IN",
          startedAt: now,
          plannedEndAt: new Date(now.getTime() + 40_000),
          objective: "오늘 컨디션 확인"
        }
      });
      await tx.lessonOccurrence.updateMany({
        where: { lessonSession: { id: lessonSessionId } },
        data: { status: "ACTIVE" }
      });
      await tx.user.update({ where: { id: updated.userId }, data: { appState: "LESSON_ACTIVE" } });
      return updated;
    });
    return serializeLessonSession(session);
  }

  async advanceLessonStage(lessonSessionId: string): Promise<Record<string, unknown>> {
    const session = await this.prisma.lessonSession.findUniqueOrThrow({ where: { id: lessonSessionId } });
    const currentIndex = LESSON_STAGE_ORDER.indexOf(session.state as LessonStage);
    const nextStage = LESSON_STAGE_ORDER[Math.min(currentIndex + 1, LESSON_STAGE_ORDER.length - 1)] ?? "COMPLETED";
    const now = new Date();
    await this.prisma.lessonStageSession.updateMany({
      where: { lessonSessionId, stageType: session.state, actualEndAt: null },
      data: { actualEndAt: now }
    });
    const updated = await this.prisma.lessonSession.update({
      where: { id: lessonSessionId },
      data: { state: nextStage }
    });
    if (nextStage !== "COMPLETED") {
      await this.prisma.lessonStageSession.create({
        data: {
          lessonSessionId,
          stageType: nextStage,
          startedAt: now,
          plannedEndAt: new Date(now.getTime() + 120_000),
          objective: stageObjective(nextStage)
        }
      });
    }
    return { decision: { from: session.state, to: nextStage, reason: "api_stage_transition" }, state: serializeLessonSession(updated) };
  }

  async recordTranscriptEvent(lessonSessionId: string, transcript: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const endedAt = new Date(now.getTime() + 1500);
    const [utterance, segment] = await this.prisma.$transaction([
      this.prisma.utterance.create({
        data: {
          lessonSessionId,
          speaker: "USER",
          transcript,
          startedAt: now,
          endedAt,
          durationMs: 1500
        }
      }),
      this.prisma.transcriptSegment.create({
        data: {
          lessonSessionId,
          speaker: "USER",
          text: transcript,
          isFinal: true,
          startedAt: now,
          endedAt
        }
      })
    ]);
    return { accepted: true, utteranceId: utterance.id, transcriptSegmentId: segment.id };
  }

  async finishLessonSession(lessonSessionId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.lessonStageSession.updateMany({
        where: { lessonSessionId, actualEndAt: null },
        data: { actualEndAt: now }
      });
      const updated = await tx.lessonSession.update({
        where: { id: lessonSessionId },
        data: { state: "COMPLETED", actualEndAt: now }
      });
      await tx.lessonOccurrence.updateMany({
        where: { lessonSession: { id: lessonSessionId } },
        data: { status: "COMPLETED", completedAt: now }
      });
      await tx.user.update({ where: { id: updated.userId }, data: { appState: "RESULT_GENERATING" } });
      return updated;
    });
    return serializeLessonSession(session);
  }

  async generateReport(lessonSessionId: string): Promise<Record<string, unknown>> {
    const session = await this.prisma.lessonSession.findUniqueOrThrow({
      where: { id: lessonSessionId },
      include: { transcriptSegments: true }
    });
    const report = validateLessonReport({
      summary: "실제 저장된 transcript를 기반으로 호텔 체크인 상황의 핵심 표현을 복습했습니다.",
      goalAchievementScore: 82,
      fluencyScore: 76,
      grammarScore: 74,
      vocabularyScore: 80,
      pronunciationScore: null,
      userSpeakingRatio: session.transcriptSegments.length > 0 ? 0.63 : 0,
      targetExpressions: [],
      goodExpressions: ["I'd like to check in.", "Could I get a quiet room?"],
      corrections: [],
      newVocabulary: ["reservation", "confirmation", "quiet room"],
      reviewItems: ["Could I get a quiet room?"],
      nextLessonRecommendation: {
        lessonTemplateSlug: "phone-reservation-a2",
        reasonKo: "전화 예약 표현으로 자연스럽게 확장할 수 있습니다."
      },
      confidence: { transcriptCoverage: session.transcriptSegments.length > 0 ? 0.82 : 0 }
    });
    const saved = await this.prisma.lessonReport.upsert({
      where: { lessonSessionId },
      update: {
        summary: report.summary,
        scores: {
          goalAchievement: report.goalAchievementScore,
          fluency: report.fluencyScore,
          grammar: report.grammarScore,
          vocabulary: report.vocabularyScore,
          pronunciation: report.pronunciationScore
        },
        userSpeakingRatio: report.userSpeakingRatio,
        reportJson: report
      },
      create: {
        lessonSessionId,
        summary: report.summary,
        scores: {
          goalAchievement: report.goalAchievementScore,
          fluency: report.fluencyScore,
          grammar: report.grammarScore,
          vocabulary: report.vocabularyScore,
          pronunciation: report.pronunciationScore
        },
        userSpeakingRatio: report.userSpeakingRatio,
        reportJson: report
      }
    });
    await this.createOutbox("LessonSession", lessonSessionId, "lesson_report.generated", { lessonSessionId }, `report:${lessonSessionId}`);
    return saved.reportJson as Record<string, unknown>;
  }

  async retrieveReport(lessonSessionId: string): Promise<Record<string, unknown>> {
    const report = await this.prisma.lessonReport.findUnique({ where: { lessonSessionId } });
    return report ? (report.reportJson as Record<string, unknown>) : this.generateReport(lessonSessionId);
  }

  async generateReviewItems(lessonSessionId: string): Promise<Array<Record<string, unknown>>> {
    const session = await this.prisma.lessonSession.findUniqueOrThrow({
      where: { id: lessonSessionId },
      include: { report: true }
    });
    const reportJson = (session.report?.reportJson ?? (await this.generateReport(lessonSessionId))) as { reviewItems?: string[] };
    const prompts = reportJson.reviewItems?.length ? reportJson.reviewItems : ["Could I get a quiet room?"];
    const items = [];
    for (const [index, prompt] of prompts.entries()) {
      const item = await this.prisma.reviewItem.create({
        data: {
          userId: session.userId,
          sourceType: "LESSON_REPORT",
          sourceId: lessonSessionId,
          prompt,
          answer: prompt,
          status: "NEW",
          nextReviewAt: new Date(Date.now() + (index + 1) * 24 * 60 * 60_000)
        }
      });
      items.push({ id: item.id, prompt: item.prompt, status: item.status, nextReviewAt: item.nextReviewAt.toISOString() });
    }
    await this.createOutbox("LessonSession", lessonSessionId, "review_items.generated", { count: items.length }, `review-items:${lessonSessionId}`);
    return items;
  }

  async listAdminMetrics(): Promise<Record<string, number>> {
    const [users, schedules, sentNotifications, openedNotifications, readyViews, startedLessons, completedLessons, snoozed, skipped, missed] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.lessonSchedule.count({ where: { enabled: true } }),
      this.prisma.notificationDelivery.count({ where: { status: "SENT" } }),
      this.prisma.notificationDelivery.count({ where: { status: { in: ["OPENED", "ACTIONED"] } } }),
      this.prisma.lessonOccurrence.count({ where: { status: "READY" } }),
      this.prisma.lessonOccurrence.count({ where: { startedAt: { not: null } } }),
      this.prisma.lessonSession.count({ where: { state: "COMPLETED" } }),
      this.prisma.lessonOccurrence.count({ where: { status: "SNOOZED" } }),
      this.prisma.lessonOccurrence.count({ where: { status: "SKIPPED" } }),
      this.prisma.lessonOccurrence.count({ where: { status: "MISSED" } })
    ]);
    return {
      dailyActiveUsers: users,
      scheduledLessons: schedules,
      pushSent: sentNotifications,
      reminderOpened: openedNotifications,
      readyViews,
      lessonStarted: startedLessons,
      lessonCompletionRate: completedLessons,
      notificationClickRate: sentNotifications ? openedNotifications / sentNotifications : 0,
      clickToLessonStartRate: openedNotifications ? startedLessons / openedNotifications : 0,
      completionRate: startedLessons ? completedLessons / startedLessons : 0,
      snoozeRate: schedules ? snoozed / schedules : 0,
      skipRate: schedules ? skipped / schedules : 0,
      missedRate: schedules ? missed / schedules : 0,
      averageUserSpeakingRatio: 0,
      realtimeErrorRate: 0
    };
  }

  async listLessonTemplates(): Promise<Array<Record<string, unknown>>> {
    const templates = await this.prisma.lessonTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return templates;
  }

  async createLessonTemplate(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const template = await this.prisma.lessonTemplate.create({
      data: {
        slug: String(body.slug ?? `lesson-${randomUUID()}`),
        titleKo: String(body.titleKo ?? "새 수업"),
        titleEn: String(body.titleEn ?? "New lesson"),
        level: (body.level as "A1" | "A2" | "B1" | "B2") ?? "A1",
        category: String(body.category ?? "general"),
        status: "DRAFT",
        versions: {
          create: {
            version: 1,
            objective: String(body.objective ?? "새 수업 목표"),
            estimatedDuration: Number(body.estimatedDuration ?? 900),
            status: "DRAFT"
          }
        }
      }
    });
    const version = await this.prisma.lessonTemplateVersion.findFirstOrThrow({
      where: { lessonTemplateId: template.id, version: 1 }
    });
    await this.audit("lesson_template.create", "LessonTemplate", template.id, null, template);
    return { ...template, activeVersionId: version.id };
  }

  async createStage(lessonTemplateVersionId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const stage = await this.prisma.lessonStageTemplate.create({
      data: {
        lessonTemplateVersionId,
        stageType: (body.stageType as LessonStage) ?? "WARM_UP",
        sequence: Number(body.sequence ?? 1),
        plannedDurationSeconds: Number(body.plannedDurationSeconds ?? 60),
        objective: String(body.objective ?? "Stage objective"),
        entryCondition: String(body.entryCondition ?? "Previous stage completed."),
        exitCondition: String(body.exitCondition ?? "Objective completed."),
        promptInstruction: String(body.promptInstruction ?? "Guide the learner through this stage."),
        backchannelEnabled: Boolean(body.backchannelEnabled ?? true),
        correctionPolicy: String(body.correctionPolicy ?? "IMMEDIATE_IMPORTANT_ONLY")
      }
    });
    await this.audit("stage.create", "LessonStageTemplate", stage.id, null, stage);
    return stage;
  }

  async createMaterialCard(lessonTemplateVersionId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const card = await this.prisma.materialCard.create({
      data: {
        lessonTemplateVersionId,
        type: String(body.type ?? "SITUATION"),
        title: String(body.title ?? "Material"),
        body: String(body.body ?? "Material body"),
        sequence: Number(body.sequence ?? 1),
        targetExpressionIds: Array.isArray(body.targetExpressionIds) ? (body.targetExpressionIds as string[]) : [],
        hints: Array.isArray(body.hints) ? (body.hints as string[]) : []
      }
    });
    await this.audit("material_card.create", "MaterialCard", card.id, null, card);
    return card;
  }

  async createPromptVersion(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const templateName = String(body.templateName ?? "admin-created");
    const template = await this.prisma.promptTemplate.upsert({
      where: { name: templateName },
      update: {},
      create: { name: templateName, description: String(body.description ?? "Admin prompt template") }
    });
    const latest = await this.prisma.promptVersion.findFirst({
      where: { promptTemplateId: template.id },
      orderBy: { version: "desc" }
    });
    const prompt = await this.prisma.promptVersion.create({
      data: {
        promptTemplateId: template.id,
        version: (latest?.version ?? 0) + 1,
        body: String(body.body ?? "You are a concise English tutor."),
        isActive: false
      }
    });
    await this.audit("prompt_version.create", "PromptVersion", prompt.id, null, prompt);
    return prompt;
  }

  async activatePromptVersion(id: string): Promise<Record<string, unknown>> {
    const prompt = await this.prisma.promptVersion.findUniqueOrThrow({ where: { id } });
    await this.prisma.promptVersion.updateMany({
      where: { promptTemplateId: prompt.promptTemplateId },
      data: { isActive: false }
    });
    const activated = await this.prisma.promptVersion.update({ where: { id }, data: { isActive: true } });
    await this.audit("prompt_version.activate", "PromptVersion", id, prompt, activated);
    return activated;
  }

  async createBackchannelClip(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tutor = await this.ensureTutor();
    const clip = await this.prisma.backchannelClip.create({
      data: {
        tutorId: String(body.tutorId ?? tutor.id),
        clipKey: String(body.clipKey ?? `clip-${randomUUID()}`),
        label: String(body.label ?? "new clip"),
        audioUrl: String(body.audioUrl ?? "/assets/backchannel/admin.mp3"),
        durationMs: Number(body.durationMs ?? 420),
        weight: Number(body.weight ?? 10)
      }
    });
    await this.audit("backchannel_clip.create", "BackchannelClip", clip.id, null, clip);
    return clip;
  }

  async listLessonSessions(): Promise<Array<Record<string, unknown>>> {
    const sessions = await this.prisma.lessonSession.findMany({
      include: { transcriptSegments: true, occurrence: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      occurrenceId: session.occurrenceId,
      state: session.state,
      transcriptCount: session.transcriptSegments.length,
      occurrenceStatus: session.occurrence?.status ?? null,
      createdAt: session.createdAt.toISOString()
    }));
  }

  async listNotificationDeliveries(): Promise<Array<Record<string, unknown>>> {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      include: { occurrence: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return deliveries.map(serializeNotificationDelivery);
  }

  async notificationOpened(id: string): Promise<Record<string, unknown>> {
    const delivery = await this.prisma.notificationDelivery.update({
      where: { id },
      data: { status: "OPENED", openedAt: new Date() },
      include: { occurrence: true }
    });
    await this.openOccurrence(delivery.occurrenceId, { notificationDeliveryId: id });
    return serializeNotificationDelivery(delivery);
  }

  async sendTestNotification(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const occurrenceId = String(body.occurrenceId);
    const occurrence = await this.prisma.lessonOccurrence.findUniqueOrThrow({ where: { id: occurrenceId } });
    const delivery = await this.prisma.notificationDelivery.create({
      data: {
        occurrenceId,
        notificationType: "LESSON_REMINDER",
        provider: String(body.provider ?? "mock"),
        status: "SENT",
        scheduledFor: new Date(),
        sentAt: new Date(),
        providerMessageId: `mock-${randomUUID()}`,
        idempotencyKey: `test-notification:${occurrenceId}:${randomUUID()}`
      }
    });
    await this.prisma.lessonOccurrence.update({ where: { id: occurrence.id }, data: { status: "NOTIFIED" } });
    return serializeNotificationDelivery(delivery);
  }

  async listPromptVersions(): Promise<Array<Record<string, unknown>>> {
    return this.prisma.promptVersion.findMany({ include: { promptTemplate: true }, orderBy: { createdAt: "desc" } });
  }

  async listFeatureFlags(): Promise<Array<Record<string, unknown>>> {
    return this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  async listTutors(): Promise<Array<Record<string, unknown>>> {
    const tutors = await this.prisma.tutor.findMany({ include: { voices: true }, orderBy: { name: "asc" } });
    return tutors.map((tutor) => ({
      id: tutor.id,
      name: tutor.name,
      personaKo: tutor.personaKo,
      imageUrl: tutor.imageUrl,
      defaultVoiceId: tutor.voices.find((voice) => voice.isDefault)?.providerKey ?? tutor.voices[0]?.providerKey ?? null
    }));
  }

  async getTutor(id: string): Promise<Record<string, unknown> | null> {
    const tutor = await this.prisma.tutor.findUnique({ where: { id }, include: { voices: true } });
    if (!tutor) return null;
    return {
      id: tutor.id,
      name: tutor.name,
      personaKo: tutor.personaKo,
      imageUrl: tutor.imageUrl,
      voices: tutor.voices
    };
  }

  async listTutorVoices(tutorId: string): Promise<Array<Record<string, unknown>>> {
    return this.prisma.tutorVoice.findMany({ where: { tutorId }, orderBy: { createdAt: "asc" } });
  }

  async createDevice(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const userId = String(body.userId);
    await this.ensureUser(userId);
    const deviceIdHash = hashToken(String(body.deviceId ?? body.deviceIdHash ?? randomUUID()));
    const device = await this.prisma.device.upsert({
      where: { userId_deviceIdHash: { userId, deviceIdHash } },
      update: pruneUndefined({
        platform: String(body.platform ?? "unknown"),
        deviceName: body.deviceName ? String(body.deviceName) : undefined,
        appVersion: body.appVersion ? String(body.appVersion) : undefined,
        osVersion: body.osVersion ? String(body.osVersion) : undefined,
        lastSeenAt: new Date()
      }),
      create: {
        userId,
        platform: String(body.platform ?? "unknown"),
        deviceName: body.deviceName ? String(body.deviceName) : null,
        appVersion: body.appVersion ? String(body.appVersion) : null,
        osVersion: body.osVersion ? String(body.osVersion) : null,
        deviceIdHash,
        lastSeenAt: new Date()
      }
    });
    return device;
  }

  async updateDevice(id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.device.update({
      where: { id },
      data: pruneUndefined({
        deviceName: body.deviceName ? String(body.deviceName) : undefined,
        appVersion: body.appVersion ? String(body.appVersion) : undefined,
        osVersion: body.osVersion ? String(body.osVersion) : undefined,
        lastSeenAt: new Date()
      })
    });
  }

  async storePushToken(deviceId: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const rawToken = String(body.token ?? body.pushToken ?? randomUUID());
    const provider = String(body.provider ?? "unknown");
    const token = await this.prisma.pushToken.upsert({
      where: { provider_tokenHash: { provider, tokenHash: hashToken(rawToken) } },
      update: pruneUndefined({
        revokedAt: null,
        tokenValue: rawToken,
        expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : undefined
      }),
      create: {
        deviceId,
        provider,
        tokenHash: hashToken(rawToken),
        tokenValue: rawToken,
        tokenLast4: rawToken.slice(-4),
        expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null
      }
    });
    return { id: token.id, deviceId, provider: token.provider, tokenLast4: token.tokenLast4, stored: true };
  }

  async deletePushToken(deviceId: string, tokenId: string): Promise<Record<string, unknown>> {
    await this.prisma.pushToken.update({ where: { id: tokenId }, data: { revokedAt: new Date() } });
    return { id: deviceId, tokenId, deleted: true };
  }

  async listReviewItems(userId?: string): Promise<Array<Record<string, unknown>>> {
    const items = await this.prisma.reviewItem.findMany({ where: userId ? { userId } : {}, orderBy: { nextReviewAt: "asc" } });
    return items.map((item) => ({ ...item, nextReviewAt: item.nextReviewAt.toISOString() }));
  }

  async answerReviewItem(id: string): Promise<Record<string, unknown>> {
    const item = await this.prisma.reviewItem.update({
      where: { id },
      data: { status: "LEARNING", intervalDays: 2, nextReviewAt: new Date(Date.now() + 2 * 24 * 60 * 60_000) }
    });
    return { id: item.id, status: item.status, intervalDays: item.intervalDays };
  }

  private async ensureUser(userId: string): Promise<void> {
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  private async ensureTutor(): Promise<{ id: string }> {
    const existing = await this.prisma.tutor.findFirst({ orderBy: { createdAt: "asc" } });
    if (existing) return existing;
    return this.prisma.tutor.create({
      data: {
        id: DEFAULT_TUTOR_ID,
        name: "Emma",
        personaKo: "차분하고 명확하게 말해주는 미국식 영어 튜터",
        personaEn: "A calm American English tutor.",
        imageUrl: "/assets/tutors/emma.png"
      }
    });
  }

  private async findDefaultLessonTemplateVersion(): Promise<{ id: string } | null> {
    return this.prisma.lessonTemplateVersion.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
  }

  private async findDefaultLessonTemplate(): Promise<{ id: string }> {
    const existing = await this.prisma.lessonTemplate.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    if (existing) return existing;

    const template = await this.prisma.lessonTemplate.upsert({
      where: { slug: "hotel-checkin-a1" },
      update: { status: "PUBLISHED" },
      create: {
        slug: "hotel-checkin-a1",
        titleKo: "호텔 체크인",
        titleEn: "Hotel check-in",
        level: "A1",
        category: "travel",
        status: "PUBLISHED",
        versions: {
          create: {
            version: 1,
            objective: "호텔 체크인 상황에서 예약 확인과 요청 표현을 연습합니다.",
            estimatedDuration: 900,
            status: "PUBLISHED",
            stages: {
              create: [
                {
                  stageType: "CHECK_IN",
                  sequence: 1,
                  plannedDurationSeconds: 40,
                  objective: "오늘 컨디션 확인",
                  entryCondition: "Learner starts the lesson.",
                  exitCondition: "Learner answers a short check-in.",
                  promptInstruction: "Greet the learner and ask one easy check-in question.",
                  backchannelEnabled: true,
                  correctionPolicy: "IMMEDIATE_IMPORTANT_ONLY"
                },
                {
                  stageType: "TARGET_PHRASES",
                  sequence: 2,
                  plannedDurationSeconds: 180,
                  objective: "핵심 체크인 표현 연습",
                  entryCondition: "Check-in is complete.",
                  exitCondition: "Learner practices two target phrases.",
                  promptInstruction: "Practice 'I'd like to check in' and 'Could I get a quiet room?'",
                  backchannelEnabled: false,
                  correctionPolicy: "IMMEDIATE_IMPORTANT_ONLY"
                }
              ]
            }
          }
        }
      },
      select: { id: true }
    });
    return template;
  }

  private async materializeOccurrence(scheduleId: string): Promise<Record<string, unknown>> {
    const schedule = await this.prisma.lessonSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
    const template = await this.findDefaultLessonTemplate();
    const scheduledAt = schedule.nextRunAt;
    const availableFrom = new Date(scheduledAt.getTime() - (schedule.preReminderMinutes ?? 10) * 60_000);
    const expiresAt = new Date(scheduledAt.getTime() + schedule.durationMinutes * 60_000 + 15 * 60_000);
    const occurrence = await this.prisma.lessonOccurrence.upsert({
      where: { idempotencyKey: `schedule:${schedule.id}:${scheduledAt.toISOString()}` },
      update: {},
      create: {
        scheduleId: schedule.id,
        userId: schedule.userId,
        tutorId: schedule.tutorId,
        lessonTemplateId: template.id,
        scheduledAt,
        availableFrom,
        expiresAt,
        status: "SCHEDULED",
        idempotencyKey: `schedule:${schedule.id}:${scheduledAt.toISOString()}`
      },
      include: { lessonTemplate: true, tutor: true }
    });
    return serializeOccurrence(occurrence);
  }

  private async audit(action: string, targetType: string, targetId: string, before: unknown, after: unknown): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        before: before as object,
        after: after as object,
        requestId: randomUUID()
      }
    });
  }

  private async createOutbox(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: unknown,
    idempotencyKey: string
  ): Promise<void> {
    await this.prisma.outboxEvent.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        aggregateType,
        aggregateId,
        eventType,
        payload: payload as object,
        idempotencyKey
      }
    });
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function computeNextRunAt(localTime: string): Date {
  const [hour = "20", minute = "30"] = localTime.split(":");
  const next = new Date();
  next.setUTCHours(Number(hour) - 9, Number(minute), 0, 0);
  if (next.getTime() < Date.now()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function stageObjective(stage: LessonStage): string {
  return {
    CHECK_IN: "오늘 컨디션 확인",
    WARM_UP: "짧은 질문으로 말문 열기",
    TARGET_PHRASES: "핵심 표현 연습",
    GUIDED_ROLEPLAY: "안내된 역할극",
    FREE_TALK: "상황 확장 대화",
    CORRECTION: "중요 오류 교정",
    WRAP_UP: "수업 마무리",
    COMPLETED: "완료"
  }[stage];
}

function serializeUser(user: { id: string; displayName: string | null; appState: string; timezone?: string; locale?: string }): Record<string, unknown> {
  return {
    id: user.id,
    displayName: user.displayName,
    appState: user.appState,
    timezone: user.timezone,
    locale: user.locale
  };
}

function serializeSchedule(schedule: {
  id: string;
  userId: string;
  tutorId: string;
  daysOfWeek: number[];
  localTime: string;
  timezone: string;
  durationMinutes: number;
  preReminderMinutes: number | null;
  enabled: boolean;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): Record<string, unknown> {
  return {
    id: schedule.id,
    userId: schedule.userId,
    tutorId: schedule.tutorId,
    daysOfWeek: schedule.daysOfWeek,
    localTime: schedule.localTime,
    timezone: schedule.timezone,
    durationMinutes: schedule.durationMinutes,
    preReminderMinutes: schedule.preReminderMinutes,
    enabled: schedule.enabled,
    nextRunAt: schedule.nextRunAt.toISOString(),
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString()
  };
}

function serializeOccurrence(occurrence: {
  id: string;
  scheduleId: string | null;
  status: string;
  scheduledAt: Date;
  availableFrom: Date;
  expiresAt: Date;
  tutorId: string;
  lessonTemplateId: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  snoozeCount?: number;
  lessonTemplate?: { titleKo: string } | null;
  tutor?: { name: string } | null;
}): Record<string, unknown> {
  return {
    id: occurrence.id,
    scheduleId: occurrence.scheduleId,
    status: occurrence.status,
    scheduledAt: occurrence.scheduledAt.toISOString(),
    availableFrom: occurrence.availableFrom.toISOString(),
    expiresAt: occurrence.expiresAt.toISOString(),
    tutorId: occurrence.tutorId,
    tutorName: occurrence.tutor?.name ?? null,
    lessonTemplateId: occurrence.lessonTemplateId,
    topicKo: occurrence.lessonTemplate?.titleKo ?? "호텔 체크인",
    startedAt: occurrence.startedAt?.toISOString() ?? null,
    completedAt: occurrence.completedAt?.toISOString() ?? null,
    snoozeCount: occurrence.snoozeCount ?? 0
  };
}

function serializeNotificationDelivery(delivery: {
  id: string;
  occurrenceId: string;
  deviceId: string | null;
  pushTokenId: string | null;
  notificationType: string;
  provider: string;
  providerMessageId: string | null;
  status: string;
  scheduledFor: Date;
  sentAt: Date | null;
  openedAt: Date | null;
  actionedAt: Date | null;
  failedAt: Date | null;
  failureCode: string | null;
  failureMessage: string | null;
}): Record<string, unknown> {
  return {
    id: delivery.id,
    occurrenceId: delivery.occurrenceId,
    deviceId: delivery.deviceId,
    pushTokenId: delivery.pushTokenId,
    notificationType: delivery.notificationType,
    provider: delivery.provider,
    providerMessageId: delivery.providerMessageId,
    status: delivery.status,
    scheduledFor: delivery.scheduledFor.toISOString(),
    sentAt: delivery.sentAt?.toISOString() ?? null,
    openedAt: delivery.openedAt?.toISOString() ?? null,
    actionedAt: delivery.actionedAt?.toISOString() ?? null,
    failedAt: delivery.failedAt?.toISOString() ?? null,
    failureCode: delivery.failureCode,
    failureMessage: delivery.failureMessage
  };
}

function serializeLessonSession(session: {
  id: string;
  userId: string;
  occurrenceId: string | null;
  state: string;
  startedAt: Date | null;
  plannedEndAt: Date | null;
  actualEndAt: Date | null;
}): Record<string, unknown> {
  return {
    sessionId: session.id,
    userId: session.userId,
    occurrenceId: session.occurrenceId,
    stage: session.state,
    startedAt: session.startedAt?.toISOString() ?? null,
    plannedEndAt: session.plannedEndAt?.toISOString() ?? null,
    actualEndAt: session.actualEndAt?.toISOString() ?? null
  };
}

function pruneUndefined<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
