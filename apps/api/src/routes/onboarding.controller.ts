import { Body, Controller, Get, Inject, Post, Put } from "@nestjs/common";
import type { LearnerProfile } from "@aiphone/contracts";
import { AppService } from "../services/app.service.js";

@Controller()
export class OnboardingController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get("onboarding/options")
  options(): Record<string, unknown> {
    return { data: this.app.getOptions() };
  }

  @Put("me/learner-profile")
  async learnerProfile(@Body() body: LearnerProfile & { userId: string }): Promise<Record<string, unknown>> {
    return { data: await this.app.saveProfile(body.userId, body) };
  }

  @Post("onboarding/complete")
  async complete(@Body() body: { userId: string }): Promise<Record<string, unknown>> {
    return { data: await this.app.completeOnboarding(body.userId) };
  }
}
