import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";

@Controller("devices")
export class DevicesController {
  @Post()
  create(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return { data: { id: "mock-device", ...body } };
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>): Record<string, unknown> {
    return { data: { id, ...body } };
  }

  @Post(":id/push-tokens")
  pushToken(@Param("id") id: string): Record<string, unknown> {
    return { data: { id: "mock-push-token", deviceId: id, stored: true } };
  }

  @Delete(":id/push-tokens/:tokenId")
  deletePushToken(@Param("id") id: string, @Param("tokenId") tokenId: string): Record<string, unknown> {
    return { data: { id, tokenId, deleted: true } };
  }
}
