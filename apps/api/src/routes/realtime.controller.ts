import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { MockAppService } from "../services/mock-app.service.js";

@Controller("realtime")
export class RealtimeController {
  constructor(private readonly app: MockAppService) {}

  @Get("defaults")
  defaults(): Record<string, unknown> {
    return { data: this.app.getRealtimeDefaults() };
  }

  @Post("sessions")
  session(@Body() body: { lessonSessionId: string; deviceId: string; localSdp?: string }): Record<string, unknown> {
    return { data: this.app.createRealtimeSession(body.lessonSessionId, body.deviceId, body.localSdp) };
  }

  @Post("sessions/:id/events")
  events(@Param("id") id: string, @Body() body: Record<string, unknown>): Record<string, unknown> {
    return { data: { sessionId: id, accepted: true, event: body } };
  }

  @Post("sessions/:id/reconnect")
  reconnect(@Param("id") id: string): Record<string, unknown> {
    return { data: { sessionId: id, state: "RECONNECTING" } };
  }
}
