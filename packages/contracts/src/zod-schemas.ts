import { z } from "zod";

export const lessonScheduleRequestSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  localTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  durationMinutes: z.number().int().min(5).max(30),
  preReminderMinutes: z.number().int().min(0).max(60).nullable().optional(),
  enabled: z.boolean().optional()
});

export const reportSchema = z.object({
  summary: z.string().min(1),
  goalAchievementScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  pronunciationScore: z.number().min(0).max(100).nullable(),
  userSpeakingRatio: z.number().min(0).max(1),
  targetExpressions: z.array(z.unknown()),
  goodExpressions: z.array(z.string()),
  corrections: z.array(z.unknown()),
  newVocabulary: z.array(z.string()),
  reviewItems: z.array(z.string()),
  nextLessonRecommendation: z.object({
    lessonTemplateSlug: z.string(),
    reasonKo: z.string()
  }),
  confidence: z.record(z.number().min(0).max(1))
});
