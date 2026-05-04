import { Controller, Post, Param, Get, UseGuards } from "@nestjs/common";
import { IngestionService } from "./ingestion.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("ingestion")
@UseGuards(JwtAuthGuard)
export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

  @Post(":cameraId/start")
  @Roles("OPERATOR", "SUPERVISOR", "ADMIN", "SUPER_ADMIN")
  async startStream(@Param("cameraId") cameraId: string) {
    await this.ingestionService.startStream(cameraId);
    return { message: "Stream started", cameraId };
  }

  @Post(":cameraId/stop")
  @Roles("OPERATOR", "SUPERVISOR", "ADMIN", "SUPER_ADMIN")
  async stopStream(@Param("cameraId") cameraId: string) {
    await this.ingestionService.stopStream(cameraId);
    return { message: "Stream stopped", cameraId };
  }

  @Get("active")
  async getActiveStreams() {
    return { cameras: this.ingestionService.getActiveStreams() };
  }
}
