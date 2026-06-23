import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller("calls")
export class CallsController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get(":id")
  async get(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.getCall(id) };
  }

  @Post("start-now")
  async startNow(@Body() body: { userId: string }): Promise<Record<string, unknown>> {
    return { data: await this.app.startNow(body.userId) };
  }

  @Post(":id/accept")
  async accept(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.acceptCall(id) };
  }

  @Post(":id/decline")
  async decline(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.declineCall(id) };
  }

  @Post(":id/snooze")
  async snooze(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.snoozeCall(id) };
  }

  @Post(":id/end")
  async end(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.endCall(id) };
  }
}
