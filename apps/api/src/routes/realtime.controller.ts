import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller("realtime")
export class RealtimeController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get("defaults")
  defaults(): Record<string, unknown> {
    return { data: this.app.getRealtimeDefaults() };
  }

  @Post("sessions")
  async session(@Body() body: { lessonSessionId: string; deviceId: string; localSdp?: string }): Promise<Record<string, unknown>> {
    return { data: await this.app.createRealtimeSession(body.lessonSessionId, body.deviceId, body.localSdp) };
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
