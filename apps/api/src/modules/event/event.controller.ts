import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { EventService } from "./event.service";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("events")
@ApiBearerAuth()
@Controller("events")
export class EventController {
  constructor(private eventService: EventService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")
  @ApiOperation({ summary: "Search events with filters (date, camera, type, severity)" })
  @ApiQuery({ name: "dateFrom", required: false, description: "Start date ISO string" })
  @ApiQuery({ name: "dateTo", required: false, description: "End date ISO string" })
  @ApiQuery({ name: "cameraId", required: false, description: "Filter by camera ID" })
  @ApiQuery({ name: "eventType", required: false, description: "Event type: motion, face, alert, system" })
  @ApiQuery({ name: "severity", required: false, description: "Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO" })
  @ApiQuery({ name: "page", required: false, description: "Page number" })
  @ApiQuery({ name: "limit", required: false, description: "Items per page" })
  async search(
    @Req() req: FastifyRequest,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("cameraId") cameraId?: string,
    @Query("eventType") eventType?: string,
    @Query("severity") severity?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const orgId = (req as any).user.orgId;
    return this.eventService.search(orgId, {
      dateFrom,
      dateTo,
      cameraId,
      eventType,
      severity,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("stats")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "VIEWER")
  @ApiOperation({ summary: "Get event count by date for timeline chart" })
  @ApiQuery({ name: "dateFrom", required: true, description: "Start date ISO string" })
  @ApiQuery({ name: "dateTo", required: true, description: "End date ISO string" })
  async getStats(
    @Req() req: FastifyRequest,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    const orgId = (req as any).user.orgId;
    if (!dateFrom || !dateTo) {
      return { error: "Les paramètres dateFrom et dateTo sont requis" };
    }
    return this.eventService.getEventCountByDate(orgId, dateFrom, dateTo);
  }

  @Get(":id")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")
  @ApiOperation({ summary: "Get detailed event information" })
  async getDetail(@Param("id") id: string) {
    return this.eventService.getEventDetail(id);
  }
}
