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
import { AnprService } from "./anpr.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  createVehicleListEntrySchema,
  updateVehicleListEntrySchema,
  vehicleEventQuerySchema,
} from "@repo/shared";

@Controller()
export class AnprController {
  constructor(private anprService: AnprService) {}

  /**
   * POST /api/anpr/evaluate
   * Receive a camera frame for ANPR evaluation. Enqueues async processing
   * and returns immediate analysis result.
   */
  @Post("anpr/evaluate")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async evaluateFrame(
    @Body() body: { imageBase64: string; cameraId: string; orgId: string },
  ) {
    const result = await this.anprService.analyzePlate(body.imageBase64, body.cameraId);
    return { plates: result };
  }

  /**
   * GET /api/anpr/events
   * List vehicle events with filters (plate, orgId, from, to, decision, page, limit).
   */
  @Get("anpr/events")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getEvents(
    @Query(new ZodValidationPipe(vehicleEventQuerySchema)) query: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    // Site-scoped: use user's orgId if no orgId filter provided
    const orgId = query.orgId || user?.orgId;
    return this.anprService.queryEvents({ ...query, orgId });
  }

  /**
   * GET /api/anpr/events/search
   * Search vehicle events by plate (alternative to query params for detail page).
   */
  @Get("anpr/events/search")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async searchEvents(
    @Query("plate") plate: string,
    @Query("limit") limit: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.anprService.queryEvents({
      plate,
      orgId: user?.orgId,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * GET /api/vehicles/list
   * List allowlist/blocklist entries. Filter by type query param.
   */
  @Get("vehicles/list")
  @Roles("ADMIN", "SUPERVISOR")
  async getList(
    @Query("type") type: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.anprService.listEntries(type, user?.orgId);
  }

  /**
   * POST /api/vehicles/list
   * Add entry to allowlist or blocklist.
   */
  @Post("vehicles/list")
  @Roles("ADMIN")
  async createEntry(
    @Body(new ZodValidationPipe(createVehicleListEntrySchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.anprService.createListEntry({
      ...body,
      createdById: user.id,
    });
  }

  /**
   * PATCH /api/vehicles/list/:id
   * Update an allowlist/blocklist entry.
   */
  @Patch("vehicles/list/:id")
  @Roles("ADMIN")
  async updateEntry(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateVehicleListEntrySchema)) body: any,
  ) {
    return this.anprService.updateListEntry(id, body);
  }

  /**
   * DELETE /api/vehicles/list/:id
   * Remove an allowlist/blocklist entry.
   */
  @Delete("vehicles/list/:id")
  @Roles("ADMIN")
  async deleteEntry(@Param("id") id: string) {
    await this.anprService.deleteListEntry(id);
    return { success: true };
  }
}
