import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller("notifications")
export class NotificationsController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get("deliveries")
  async listDeliveries(): Promise<Record<string, unknown>> {
    return { data: await this.app.listNotificationDeliveries() };
  }

  @Post("deliveries/:id/open")
  async opened(@Param("id") id: string): Promise<Record<string, unknown>> {
    return { data: await this.app.notificationOpened(id) };
  }

  @Post("test")
  async sendTest(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.sendTestNotification(body) };
  }
}
