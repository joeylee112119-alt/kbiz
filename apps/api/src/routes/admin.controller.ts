import { Body, Controller, Get, Post } from "@nestjs/common";
import { MockAppService } from "../services/mock-app.service.js";

@Controller("admin")
export class AdminController {
  constructor(private readonly app: MockAppService) {}

  @Get("dashboard")
  dashboard(): Record<string, unknown> {
    return { data: this.app.listAdminMetrics() };
  }

  @Get("content/lesson-templates")
  lessonTemplates(): Record<string, unknown> {
    return { data: [{ slug: "hotel-checkin-a1", titleKo: "호텔 체크인", status: "PUBLISHED" }] };
  }

  @Post("content/lesson-templates")
  createLessonTemplate(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return { data: { ...body, id: "mock-template", auditLogged: true } };
  }

  @Get("ai/prompt-versions")
  promptVersions(): Record<string, unknown> {
    return { data: [{ id: "prompt-v1", version: 1, active: true }] };
  }

  @Get("feature-flags")
  featureFlags(): Record<string, unknown> {
    return { data: [{ key: "leagues", enabled: false }] };
  }
}
