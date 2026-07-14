import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AccessService } from "./access.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  createCredentialSchema,
  updateCredentialSchema,
  createAccessLevelSchema,
  createScheduleSchema,
  updateScheduleSchema,
  createZoneSchema,
  createDoorSchema,
  createCameraDoorMapSchema,
} from "@repo/shared";

@Controller("access")
export class AccessController {
  constructor(private accessService: AccessService) {}

  // ── Credentials ──

  @Post("credentials")
  @Roles("ADMIN", "SUPER_ADMIN")
  async createCredential(@Body(new ZodValidationPipe(createCredentialSchema)) body: any) {
    return this.accessService.createCredential(body);
  }

  @Get("credentials")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async listCredentials(
    @Query("type") type?: string,
    @Query("userId") userId?: string,
    @Query("isActive") isActive?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.accessService.listCredentials({
      type,
      userId,
      isActive,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      siteId: user?.siteId,
    });
  }

  @Get("credentials/:id")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async getCredential(@Param("id") id: string) {
    return this.accessService.getCredential(id);
  }

  @Patch("credentials/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async updateCredential(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCredentialSchema)) body: any,
  ) {
    return this.accessService.updateCredential(id, body);
  }

  @Delete("credentials/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async deactivateCredential(@Param("id") id: string) {
    return this.accessService.deactivateCredential(id);
  }

  @Post("credentials/:id/qr")
  @Roles("ADMIN", "SUPER_ADMIN")
  async generateQrCode(@Param("id") id: string) {
    return this.accessService.generateQrCode(id);
  }

  // ── Access Levels ──

  @Post("levels")
  @Roles("ADMIN", "SUPER_ADMIN")
  async createAccessLevel(@Body(new ZodValidationPipe(createAccessLevelSchema)) body: any) {
    return this.accessService.createAccessLevel(body);
  }

  @Get("levels")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async listAccessLevels(
    @Query("credentialId") credentialId?: string,
    @Query("zoneId") zoneId?: string,
  ) {
    return this.accessService.listAccessLevels({ credentialId, zoneId });
  }

  @Delete("levels/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async removeAccessLevel(@Param("id") id: string) {
    return this.accessService.removeAccessLevel(id);
  }

  // ── Schedules ──

  @Post("schedules")
  @Roles("ADMIN", "SUPER_ADMIN")
  async createSchedule(@Body(new ZodValidationPipe(createScheduleSchema)) body: any) {
    return this.accessService.createSchedule(body);
  }

  @Get("schedules")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async listSchedules(@Query("zoneId") zoneId?: string) {
    return this.accessService.listSchedules({ zoneId });
  }

  @Patch("schedules/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async updateSchedule(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateScheduleSchema)) body: any,
  ) {
    return this.accessService.updateSchedule(id, body);
  }

  @Delete("schedules/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async removeSchedule(@Param("id") id: string) {
    return this.accessService.removeSchedule(id);
  }

  // ── Zones ──

  @Post("zones")
  @Roles("ADMIN", "SUPER_ADMIN")
  async createZone(@Body(new ZodValidationPipe(createZoneSchema)) body: any) {
    return this.accessService.createZone(body);
  }

  @Get("zones")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async listZones(@Req() req?: FastifyRequest) {
    const user = (req as any)?.user;
    return this.accessService.listZones(user?.siteId);
  }

  // ── Doors ──

  @Post("doors")
  @Roles("ADMIN", "SUPER_ADMIN")
  async registerDoor(@Body(new ZodValidationPipe(createDoorSchema)) body: any) {
    return this.accessService.registerDoor(body);
  }

  @Get("doors")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async listDoors(@Req() req?: FastifyRequest) {
    const user = (req as any)?.user;
    return this.accessService.listDoors(user?.siteId);
  }

  // ── Camera-Door Mapping ──

  @Post("camera-door-map")
  @Roles("ADMIN", "SUPER_ADMIN")
  async mapCameraToDoor(@Body(new ZodValidationPipe(createCameraDoorMapSchema)) body: any) {
    return this.accessService.mapCameraToDoor(body);
  }

  @Delete("camera-door-map/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async removeCameraDoorMap(@Param("id") id: string) {
    return this.accessService.removeCameraDoorMap(id);
  }

  // ── Access Evaluation ──

  @Post("evaluate")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async evaluateAccess(
    @Body() body: { credentialId: string; doorId: string; siteId: string },
  ) {
    return this.accessService.evaluateAccess(body.credentialId, body.doorId, body.siteId);
  }
}
