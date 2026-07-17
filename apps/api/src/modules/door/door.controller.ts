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
import { DoorService } from "./door.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import {
  updateAlertConfigSchema,
  emergencyOverrideSchema,
  doorCommandSchema,
  createDoorMonitoringSchema,
  createCameraDoorMapSchema,
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
    const orgId = user?.orgId;
    if (!orgId) {
      return [];
    }
    return this.doorService.getAllDoorStates(orgId);
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
    const orgId = user?.orgId ?? "";
    await this.doorService.lockdownZone(
      zoneId,
      orgId,
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
    const orgId = user?.orgId ?? "";
    await this.doorService.emergencyUnlockZone(
      zoneId,
      orgId,
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
    const orgId = user?.orgId ?? "";
    await this.doorService.clearEmergencyOverride(
      zoneId,
      orgId,
      user?.id ?? "unknown",
    );
    return { status: "cleared", zoneId };
  }

  /**
   * POST /api/doors/:id/cmd
   * Send lock/unlock command to door (D-04).
   */
  @Post(":id/cmd")
  @Audited({ entity: "door", action: "UPDATE" })
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async sendDoorCommand(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(doorCommandSchema)) body: { command: "lock" | "unlock" },
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return await this.doorService.sendCommand(id, body.command, user?.orgId);
  }

  /**
   * POST /api/doors
   * Create a new door (D-17 controller enrollment).
   * Uses createDoorMonitoringSchema (Phase 2 variant — not createDoorSchema from access.schema.ts).
   */
  @Post()
  @Audited({ entity: "door", action: "CREATE" })
  @Roles("ADMIN", "SUPER_ADMIN")
  async createDoor(
    @Body(new ZodValidationPipe(createDoorMonitoringSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return await this.doorService.create(body, user?.orgId);
  }

  /**
   * GET /api/doors/:id/camera-maps
   * List camera associations for a door (D-10).
   */
  @Get(":id/camera-maps")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async getCameraMaps(@Param("id") id: string) {
    return this.doorService.getCameraMaps(id);
  }

  /**
   * POST /api/doors/:id/camera-maps
   * Associate a camera with a door (D-10).
   */
  @Post(":id/camera-maps")
  @Audited({ entity: "camera-door-map", action: "CREATE" })
  @Roles("ADMIN", "SUPER_ADMIN")
  async createCameraMap(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createCameraDoorMapSchema)) body: any,
  ) {
    return this.doorService.createCameraMap(id, body);
  }

  /**
   * DELETE /api/doors/:id/camera-maps/:mapId
   * Remove a camera-door association (D-10).
   */
  @Delete(":id/camera-maps/:mapId")
  @Audited({ entity: "camera-door-map", action: "DELETE" })
  @Roles("ADMIN", "SUPER_ADMIN")
  async deleteCameraMap(@Param("mapId") mapId: string) {
    return this.doorService.deleteCameraMap(mapId);
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
