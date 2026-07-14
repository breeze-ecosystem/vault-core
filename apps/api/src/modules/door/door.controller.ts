import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { DoorService } from "./door.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import {
  updateAlertConfigSchema,
  emergencyOverrideSchema,
} from "@repo/shared";

@Controller("doors")
export class DoorController {
  constructor(private doorService: DoorService) {}

  /**
   * GET /api/doors/states
   * Returns current state for all doors in the user's site.
   */
  @Get("states")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")
  async getAllStates(@Req() req: FastifyRequest) {
    const user = (req as any)?.user;
    const siteId = user?.siteId;
    if (!siteId) {
      return [];
    }
    return this.doorService.getAllDoorStates(siteId);
  }

  /**
   * GET /api/doors/:id/state
   * Returns current state for a single door.
   */
  @Get(":id/state")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")
  async getDoorState(@Param("id") id: string) {
    return this.doorService.getDoorState(id);
  }

  /**
   * GET /api/doors/:id/history
   * Returns door state history from the hypertable.
   */
  @Get(":id/history")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getDoorStateHistory(
    @Param("id") id: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    const fromDate = from ?? new Date(Date.now() - 86400000).toISOString();
    const toDate = to ?? new Date().toISOString();
    return this.doorService.getDoorStateHistory(id, fromDate, toDate);
  }

  /**
   * POST /api/doors/zones/:zoneId/lockdown
   * Triggers emergency lockdown for a zone.
   */
  @Post("zones/:zoneId/lockdown")
  @Audited({ entity: "zone_emergency", action: "CREATE" })
  @Roles("ADMIN", "SUPERVISOR")
  async lockdownZone(
    @Param("zoneId") zoneId: string,
    @Body(new ZodValidationPipe(emergencyOverrideSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    const siteId = user?.siteId ?? "";
    await this.doorService.lockdownZone(
      zoneId,
      siteId,
      user?.id ?? "unknown",
      body.reason,
    );
    return { status: "lockdown", zoneId };
  }

  /**
   * POST /api/doors/zones/:zoneId/emergency-unlock
   * Triggers emergency unlock for a zone.
   */
  @Post("zones/:zoneId/emergency-unlock")
  @Audited({ entity: "zone_emergency", action: "CREATE" })
  @Roles("ADMIN", "SUPERVISOR")
  async emergencyUnlockZone(
    @Param("zoneId") zoneId: string,
    @Body(new ZodValidationPipe(emergencyOverrideSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    const siteId = user?.siteId ?? "";
    await this.doorService.emergencyUnlockZone(
      zoneId,
      siteId,
      user?.id ?? "unknown",
      body.reason,
    );
    return { status: "emergency-unlock", zoneId };
  }

  /**
   * POST /api/doors/zones/:zoneId/clear-emergency
   * Clears emergency override for a zone.
   */
  @Post("zones/:zoneId/clear-emergency")
  @Roles("ADMIN", "SUPERVISOR")
  async clearEmergency(
    @Param("zoneId") zoneId: string,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    const siteId = user?.siteId ?? "";
    await this.doorService.clearEmergencyOverride(
      zoneId,
      siteId,
      user?.id ?? "unknown",
    );
    return { status: "cleared", zoneId };
  }

  /**
   * PATCH /api/doors/:id/alert-config
   * Updates alert configuration for a specific door.
   */
  @Patch(":id/alert-config")
  @Roles("ADMIN")
  async updateAlertConfig(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateAlertConfigSchema)) body: any,
  ) {
    await this.doorService.updateAlertConfig(id, body);
    return { success: true, doorId: id };
  }

  /**
   * PATCH /api/doors/:id
   * Updates door metadata (name, zone, controllerId).
   */
  @Patch(":id")
  @Audited({ entity: "door", action: "UPDATE", captureChanges: true })
  @Roles("ADMIN")
  async updateDoor(
    @Param("id") id: string,
    @Body() body: { name?: string; zoneId?: string; controllerId?: string },
  ) {
    await this.doorService.updateDoor(id, body);
    return { success: true, doorId: id };
  }
}
