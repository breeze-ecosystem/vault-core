import { Controller, Get, Post, Param, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { EquipmentService } from "./equipment.service";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("equipment")
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get("cameras")
  @Roles("ADMIN", "SUPERVISOR")
  async getCameras(@Req() req: FastifyRequest) {
    return this.equipmentService.getCameraHealth();
  }

  @Get("cameras/:id/history")
  @Roles("ADMIN", "SUPERVISOR")
  async getCameraHistory(
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.equipmentService.getCameraHealthHistory(id, from, to);
  }

  @Get("readers")
  @Roles("ADMIN", "SUPERVISOR")
  async getReaders() {
    return this.equipmentService.getReaderHealth();
  }

  @Get("readers/:id/history")
  @Roles("ADMIN", "SUPERVISOR")
  async getReaderHistory(
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.equipmentService.getReaderHealthHistory(id, from, to);
  }

  @Get("controllers")
  @Roles("ADMIN", "SUPERVISOR")
  async getControllers() {
    return this.equipmentService.getControllerHealth();
  }

  @Get("controllers/:id/history")
  @Roles("ADMIN", "SUPERVISOR")
  async getControllerHistory(
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.equipmentService.getControllerHealthHistory(id, from, to);
  }

  // ──────────────────────────────────────────────
  // Predictive Health Endpoints (Plan 03-04)
  // ──────────────────────────────────────────────

  @Get("predictions")
  @Roles("ADMIN", "SUPERVISOR")
  async getPredictions(
    @Query("siteId") siteId?: string,
    @Query("deviceType") deviceType?: string,
    @Query("metric") metric?: string,
    @Query("triggeredAlert") triggeredAlert?: string,
  ) {
    return this.equipmentService.getPredictions({
      siteId,
      deviceType,
      metric,
      triggeredAlert: triggeredAlert !== undefined ? triggeredAlert === "true" : undefined,
    });
  }

  @Get("predictions/summary")
  @Roles("ADMIN", "SUPERVISOR")
  async getPredictiveSummary(@Query("siteId") siteId?: string) {
    return this.equipmentService.getPredictiveHealthSummary(siteId);
  }

  @Get("camera-door-map")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getCameraDoorMap(@Query("siteId") siteId?: string) {
    return this.equipmentService.getCameraDoorAssociations(siteId);
  }

  @Post("predictions/run")
  @Roles("ADMIN")
  async triggerPredictionRun() {
    await this.equipmentService.computePredictions();
    return { triggered: true };
  }
}
