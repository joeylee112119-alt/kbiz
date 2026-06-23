import { Body, Controller, Delete, Get, Inject, Patch, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller()
export class AuthController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Post("auth/guest")
  async guest(): Promise<Record<string, unknown>> {
    return { data: await this.app.createGuest() };
  }

  @Post("auth/refresh")
  refresh(): Record<string, unknown> {
    return { data: { refreshed: false, reason: "REFRESH_TOKEN_REQUIRED" } };
  }

  @Post("auth/logout")
  logout(): Record<string, unknown> {
    return { data: { ok: true } };
  }

  @Post("auth/link/apple")
  linkApple(): Record<string, unknown> {
    return { data: { provider: "apple", linked: false, reason: "APPLE_IDENTITY_TOKEN_REQUIRED" } };
  }

  @Post("auth/link/google")
  linkGoogle(): Record<string, unknown> {
    return { data: { provider: "google", linked: false, reason: "GOOGLE_IDENTITY_TOKEN_REQUIRED" } };
  }

  @Get("me")
  me(): Record<string, unknown> {
    return { data: { authenticated: false, reason: "USER_CONTEXT_REQUIRED" } };
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
