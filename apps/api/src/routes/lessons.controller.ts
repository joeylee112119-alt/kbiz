import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { MockAppService } from "../services/mock-app.service.js";

@Controller()
export class LessonsController {
  constructor(private readonly app: MockAppService) {}

  @Get("lessons/today")
  today(): Record<string, unknown> {
    return { data: this.app.todayLesson() };
  }

  @Get("lesson-sessions/:id")
  get(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.createOrchestrator(id).getState() };
  }

  @Post("lesson-sessions/:id/start")
  start(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.startLessonSession(id) };
  }

  @Post("lesson-sessions/:id/stage-transition")
  stageTransition(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.advanceLessonStage(id) };
  }

  @Post("lesson-sessions/:id/transcript-events")
  transcriptEvent(@Param("id") id: string, @Body() body: { transcript?: string }): Record<string, unknown> {
    return { data: this.app.recordTranscriptEvent(id, body.transcript ?? "") };
  }

  @Post("lesson-sessions/:id/end")
  end(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.finishLessonSession(id) };
  }

  @Post("lesson-sessions/:id/report/generate")
  generateReport(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.generateReport(id) };
  }

  @Get("lesson-sessions/:id/report")
  report(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.retrieveReport(id) };
  }

  @Post("lesson-sessions/:id/review-items/generate")
  generateReview(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.generateReviewItems(id) };
  }
}
