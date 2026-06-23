import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller("lesson-occurrences")
export class LessonOccurrencesController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get()
  async list(): Promise<Record<string, unknown>> {
    return { data: await this.app.listUpcomingOccurrences() };
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.getOccurrence(id) };
  }

  @Post("start-now")
  async startNow(@Body() body: { userId: string }): Promise<Record<string, unknown>> {
    return { data: await this.app.startNowOccurrence(body.userId) };
  }

  @Post(":id/open")
  async open(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.openOccurrence(id, body) };
  }

  @Post(":id/start")
  async start(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.startOccurrence(id, body) };
  }

  @Post(":id/snooze")
  async snooze(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.snoozeOccurrence(id) };
  }

  @Post(":id/skip")
  async skip(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.skipOccurrence(id) };
  }

  @Post(":id/dismiss")
  async dismiss(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.dismissOccurrence(id) };
  }
}
