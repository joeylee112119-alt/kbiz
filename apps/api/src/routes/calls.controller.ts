import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { MockAppService } from "../services/mock-app.service.js";

@Controller("calls")
export class CallsController {
  constructor(private readonly app: MockAppService) {}

  @Get(":id")
  get(@Param("id") id: string): Record<string, unknown> {
    return { data: { id } };
  }

  @Post("start-now")
  startNow(@Body() body: { userId?: string }): Record<string, unknown> {
    return { data: this.app.startNow(body.userId ?? "mock-user") };
  }

  @Post(":id/accept")
  accept(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.acceptCall(id) };
  }

  @Post(":id/decline")
  decline(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.declineCall(id) };
  }

  @Post(":id/snooze")
  snooze(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.snoozeCall(id) };
  }

  @Post(":id/end")
  end(@Param("id") id: string): Record<string, unknown> {
    return { data: { id, status: "COMPLETED" } };
  }
}
