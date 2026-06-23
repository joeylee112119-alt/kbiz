import { Body, Controller, Delete, Inject, Param, Patch, Post } from "@nestjs/common";
import { AppService } from "../services/app.service.js";

@Controller("devices")
export class DevicesController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Post()
  async create(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.createDevice(body) };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.updateDevice(id, body) };
  }

  @Post(":id/push-tokens")
  async pushToken(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { data: await this.app.storePushToken(id, body) };
  }

  @Delete(":id/push-tokens/:tokenId")
  async deletePushToken(@Param("id") id: string, @Param("tokenId") tokenId: string): Promise<Record<string, unknown>> {
    return { data: await this.app.deletePushToken(id, tokenId) };
  }
}
