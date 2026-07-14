import { Controller, Get, Param, Query, Req } from "@nestjs/common";
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
}
