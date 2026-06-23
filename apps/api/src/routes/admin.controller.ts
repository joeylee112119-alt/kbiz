import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller("admin")
export class AdminController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get("dashboard")
  async dashboard(): Promise<Record<string, unknown>> {
    return { data: await this.app.listAdminMetrics() };
  }

  @Get("content/lesson-templates")
  async lessonTemplates(): Promise<Record<string, unknown>> {
    return { data: await this.app.listLessonTemplates() };
  }

  @Post("content/lesson-templates")
  async createLessonTemplate(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.createLessonTemplate(body) };
  }

  @Get("ai/prompt-versions")
  async promptVersions(): Promise<Record<string, unknown>> {
    return { data: await this.app.listPromptVersions() };
  }

  @Get("feature-flags")
  async featureFlags(): Promise<Record<string, unknown>> {
    return { data: await this.app.listFeatureFlags() };
  }
}
