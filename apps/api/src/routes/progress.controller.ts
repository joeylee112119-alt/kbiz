import { Controller, Get } from "@nestjs/common";

@Controller("progress")
export class ProgressController {
  @Get()
  progress(): Record<string, unknown> {
    return { data: { streakDays: 4, completedLessons: 6, totalSpeakingSeconds: 3120, learnedExpressions: 28 } };
  }

  @Get("weekly")
  weekly(): Record<string, unknown> {
    return { data: [12, 15, 0, 15, 15, 0, 10] };
  }

  @Get("monthly")
  monthly(): Record<string, unknown> {
    return { data: { completedLessons: 18, speakingMinutes: 128 } };
  }
}
