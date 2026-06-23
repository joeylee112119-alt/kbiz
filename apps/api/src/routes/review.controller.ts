import { Controller, Delete, Get, Param, Post } from "@nestjs/common";

@Controller()
export class ReviewController {
  @Get("review-items")
  list(): Record<string, unknown> {
    return { data: [{ id: "review-1", prompt: "Could I get a quiet room?", status: "NEW", nextReviewAt: new Date().toISOString() }] };
  }

  @Post("review-items/:id/answer")
  answer(@Param("id") id: string): Record<string, unknown> {
    return { data: { id, status: "LEARNING", intervalDays: 2 } };
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
