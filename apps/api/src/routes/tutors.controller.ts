import { Controller, Get, Param } from "@nestjs/common";
import { MockAppService } from "../services/mock-app.service.js";

@Controller("tutors")
export class TutorsController {
  constructor(private readonly app: MockAppService) {}

  @Get()
  list(): Record<string, unknown> {
    return { data: this.app.tutors };
  }

  @Get(":id")
  get(@Param("id") id: string): Record<string, unknown> {
    return { data: this.app.tutors.find((tutor) => tutor.id === id) ?? null };
  }

  @Get(":id/voices")
  voices(@Param("id") id: string): Record<string, unknown> {
    return { data: [{ id: `${id}-voice-marin`, providerKey: "marin", displayName: "Marin" }] };
  }
}
