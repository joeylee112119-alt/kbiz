import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller()
export class LessonsController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get("lessons/today")
  today(): Record<string, unknown> {
    return { data: this.app.todayLesson() };
  }

  @Get("lesson-sessions/:id")
  async get(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.getLessonSession(id) };
  }

  @Post("lesson-sessions/:id/start")
  async start(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.startLessonSession(id) };
  }

  @Post("lesson-sessions/:id/stage-transition")
  async stageTransition(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.advanceLessonStage(id) };
  }

  @Post("lesson-sessions/:id/transcript-events")
  async transcriptEvent(@Param("id") id: string, @Body() body: { transcript?: string }): Promise<Record<string, unknown>> {
    return { data: await this.app.recordTranscriptEvent(id, body.transcript ?? "") };
  }

  @Post("lesson-sessions/:id/end")
  async end(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.finishLessonSession(id) };
  }

  @Post("lesson-sessions/:id/report/generate")
  async generateReport(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.generateReport(id) };
  }

  @Get("lesson-sessions/:id/report")
  async report(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.retrieveReport(id) };
  }

  @Post("lesson-sessions/:id/review-items/generate")
  async generateReview(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.generateReviewItems(id) };
  }
}
