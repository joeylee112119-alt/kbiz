import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
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

  @Post("content/lesson-template-versions/:id/stages")
  async createStage(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.createStage(id, body) };
  }

  @Post("content/lesson-template-versions/:id/material-cards")
  async createMaterialCard(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.createMaterialCard(id, body) };
  }

  @Get("ai/prompt-versions")
  async promptVersions(): Promise<Record<string, unknown>> {
    return { data: await this.app.listPromptVersions() };
  }

  @Post("ai/prompt-versions")
  async createPromptVersion(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.createPromptVersion(body) };
  }

  @Post("ai/prompt-versions/:id/activate")
  async activatePromptVersion(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.activatePromptVersion(id) };
  }

  @Post("backchannel-clips")
  async createBackchannelClip(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.createBackchannelClip(body) };
  }

  @Get("lesson-sessions")
  async lessonSessions(): Promise<Record<string, unknown>> {
    return { data: await this.app.listLessonSessions() };
  }

  @Get("feature-flags")
  async featureFlags(): Promise<Record<string, unknown>> {
    return { data: await this.app.listFeatureFlags() };
  }
}
