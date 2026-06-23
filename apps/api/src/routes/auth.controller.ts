import { Body, Controller, Delete, Get, Patch, Post } from "@nestjs/common";
import { MockAppService } from "../services/mock-app.service.js";

@Controller()
export class AuthController {
  constructor(private readonly app: MockAppService) {}

  @Post("auth/guest")
  guest(): Record<string, unknown> {
    return { data: this.app.createGuest() };
  }

  @Post("auth/refresh")
  refresh(): Record<string, unknown> {
    return { data: { accessToken: `mock-access-${Date.now()}` } };
  }

  @Post("auth/logout")
  logout(): Record<string, unknown> {
    return { data: { ok: true } };
  }

  @Post("auth/link/apple")
  linkApple(): Record<string, unknown> {
    return { data: { provider: "apple", linked: false, mode: "mock" } };
  }

  @Post("auth/link/google")
  linkGoogle(): Record<string, unknown> {
    return { data: { provider: "google", linked: false, mode: "mock" } };
  }

  @Get("me")
  me(): Record<string, unknown> {
    return { data: { id: "mock-user", appState: "HOME" } };
  }

  @Patch("me")
  updateMe(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return { data: body };
  }

  @Delete("me")
  deleteMe(): Record<string, unknown> {
    return { data: { deleted: true } };
  }
}
