import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import type { CallScheduleRequest } from "@aiphone/contracts";
import { AppService } from "../services/app.service.js";

@Controller("call-schedules")
export class SchedulesController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get()
  async list(): Promise<Record<string, unknown>> {
    return { data: await this.app.listSchedules() };
  }

  @Post()
  async create(@Body() body: CallScheduleRequest & { userId: string }): Promise<Record<string, unknown>> {
    return { data: await this.app.createSchedule(body.userId, body) };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: Partial<CallScheduleRequest>): Promise<Record<string, unknown>> {
    return { data: await this.app.updateSchedule(id, body) };
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.deleteSchedule(id) };
  }

  @Post(":id/pause")
  async pause(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.pauseSchedule(id) };
  }

  @Post(":id/resume")
  async resume(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.resumeSchedule(id) };
  }
}
