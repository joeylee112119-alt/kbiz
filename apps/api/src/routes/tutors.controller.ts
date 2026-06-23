import { Controller, Get, Inject, Param } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller("tutors")
export class TutorsController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get()
  async list(): Promise<Record<string, unknown>> {
    return { data: await this.app.listTutors() };
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.getTutor(id) };
  }

  @Get(":id/voices")
  async voices(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.listTutorVoices(id) };
  }
}
