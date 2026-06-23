import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import type { CallScheduleRequest } from "@aiphone/contracts";
import { MockAppService } from "../services/mock-app.service.js";

@Controller("call-schedules")
export class SchedulesController {
  constructor(private readonly app: MockAppService) {}

  @Get()
  list(): Record<string, unknown> {
    return { data: [] };
  }

  @Post()
  create(@Body() body: CallScheduleRequest & { userId?: string }): Record<string, unknown> {
    return { data: this.app.createSchedule(body.userId ?? "mock-user", body) };
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>): Record<string, unknown> {
    return { data: { id, ...body } };
  }

  @Delete(":id")
  delete(@Param("id") id: string): Record<string, unknown> {
    return { data: { id, deleted: true } };
  }

  @Post(":id/pause")
  pause(@Param("id") id: string): Record<string, unknown> {
    return { data: { id, paused: true } };
  }

  @Post(":id/resume")
  resume(@Param("id") id: string): Record<string, unknown> {
    return { data: { id, paused: false } };
  }
}
