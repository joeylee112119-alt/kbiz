import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import type { LearnerProfile } from "@aiphone/contracts";
import { MockAppService } from "../services/mock-app.service.js";

@Controller()
export class OnboardingController {
  constructor(private readonly app: MockAppService) {}

  @Get("onboarding/options")
  options(): Record<string, unknown> {
    return { data: this.app.getOptions() };
  }

  @Put("me/learner-profile")
  learnerProfile(@Body() body: LearnerProfile & { userId?: string }): Record<string, unknown> {
    return { data: this.app.saveProfile(body.userId ?? "mock-user", body) };
  }

  @Post("onboarding/complete")
  complete(): Record<string, unknown> {
    return { data: { appState: "TRIAL_READY" } };
  }
}
