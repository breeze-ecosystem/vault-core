import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { MaintenanceService } from "./maintenance.service";
import { createMaintenanceTicketSchema, maintenanceQuerySchema } from "@repo/shared";
import type { CreateMaintenanceTicketInput, MaintenanceQueryInput } from "@repo/shared";
import type { MaintenanceTicketDto, UnifiedIncidentDto } from "@repo/shared";

@Controller("maintenance")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  /**
   * GET /api/maintenance/tickets — List maintenance tickets.
   */
  @Get("tickets")
  @Roles("ADMIN", "SUPERVISOR", "MAINTENANCE_TEAM")
  async listTickets(
    @Query(new ZodValidationPipe(maintenanceQuerySchema)) params: MaintenanceQueryInput,
  ): Promise<{ data: MaintenanceTicketDto[]; total: number; page: number; limit: number }> {
    return this.maintenanceService.listTickets(params);
  }

  /**
   * GET /api/maintenance/tickets/:id — Get a single maintenance ticket.
   */
  @Get("tickets/:id")
  @Roles("ADMIN", "SUPERVISOR", "MAINTENANCE_TEAM")
  async getTicket(@Param("id") id: string): Promise<MaintenanceTicketDto> {
    return this.maintenanceService.getTicket(id);
  }

  /**
   * POST /api/maintenance/tickets — Manually create a maintenance ticket.
   */
  @Post("tickets")
  @Roles("ADMIN", "SUPERVISOR")
  async createTicket(
    @Body(new ZodValidationPipe(createMaintenanceTicketSchema)) dto: CreateMaintenanceTicketInput,
    @Req() req: any,
  ): Promise<MaintenanceTicketDto> {
    return this.maintenanceService.createManualTicket(dto, req.user?.id);
  }

  /**
   * PATCH /api/maintenance/tickets/:id/status — Transition ticket status.
   */
  @Patch("tickets/:id/status")
  @Roles("ADMIN", "SUPERVISOR", "MAINTENANCE_TEAM")
  @HttpCode(HttpStatus.OK)
  async transitionStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Req() req: any,
  ): Promise<MaintenanceTicketDto> {
    return this.maintenanceService.transitionTicketStatus(id, status, req.user);
  }

  /**
   * POST /api/maintenance/tickets/:id/assign — Assign a maintenance ticket.
   */
  @Post("tickets/:id/assign")
  @Roles("ADMIN", "SUPERVISOR")
  @HttpCode(HttpStatus.OK)
  async assignTicket(
    @Param("id") id: string,
    @Body("userId") userId: string,
    @Req() req: any,
  ): Promise<MaintenanceTicketDto> {
    return this.maintenanceService.assignTicket(id, userId, req.user);
  }

  /**
   * GET /api/maintenance/unified — Unified incident list (both security and maintenance).
   */
  @Get("unified")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR", "MAINTENANCE_TEAM")
  async getUnifiedIncidents(
    @Query() params: { siteId?: string; ticketType?: string; status?: string; severity?: string; page?: number; limit?: number },
  ): Promise<{ data: UnifiedIncidentDto[]; total: number; page: number; limit: number }> {
    return this.maintenanceService.getUnifiedIncidents(params);
  }
}
