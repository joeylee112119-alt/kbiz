import { Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller()
export class ReviewController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get("review-items")
  async list(): Promise<Record<string, unknown>> {
    return { data: await this.app.listReviewItems() };
  }

  @Post("review-items/:id/answer")
  async answer(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.answerReviewItem(id) };
  }

  @Post("expressions/:id/save")
  save(@Param("id") id: string): Record<string, unknown> {
    return { data: { id, saved: true } };
  }

  @Delete("expressions/:id/save")
  unsave(@Param("id") id: string): Record<string, unknown> {
    return { data: { id, saved: false } };
  }
}
