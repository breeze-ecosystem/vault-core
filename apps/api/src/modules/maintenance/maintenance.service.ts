import { Injectable, Logger, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { IncidentStateMachine } from "../incident/incident-state-machine";
import type { CreateMaintenanceTicketInput, MaintenanceQueryInput } from "@repo/shared";
import type { MaintenanceTicketDto, UnifiedIncidentDto } from "@repo/shared";

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly incidentStateMachine: IncidentStateMachine,
  ) {}

  /**
   * Auto-create a maintenance ticket when equipment.alert is emitted (WFL-01).
   * Checks for existing unresolved tickets for the same device to prevent duplicates.
   */
  @OnEvent("equipment.alert", { async: true })
  async onEquipmentAlert(payload: {
    deviceType: string;
    deviceId: string;
    status: string;
    organizationId: string;
    batteryLevel?: number;
    timestamp?: string;
  }): Promise<MaintenanceTicketDto | null> {
    try {
      // Dedup: check for existing unresolved maintenance tickets for the same device
      const existing = await this.prisma.incident.findFirst({
        where: {
          ticketType: "MAINTENANCE_TICKET",
          deviceId: payload.deviceId,
          status: { in: ["open", "in_progress"] },
        },
      });
      if (existing) {
        this.logger.log(`Duplicate equipment.alert suppressed for ${payload.deviceType} ${payload.deviceId} — ticket ${existing.id} already open`);
        return null;
      }

      // Map status to severity
      const severityMap: Record<string, string> = {
        offline: "HIGH",
        "low-battery": "MEDIUM",
        "connection-issue": "LOW",
      };
      const severity = severityMap[payload.status] || "MEDIUM";

      // Build description
      const description = [
        `Équipement: ${payload.deviceType}`,
        `Statut: ${payload.status}`,
        payload.batteryLevel !== undefined ? `Batterie: ${payload.batteryLevel}%` : null,
        payload.timestamp ? `Date: ${payload.timestamp}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const ticket = await this.prisma.incident.create({
        data: {
          title: `${payload.deviceType.toUpperCase()} — ${payload.status}`,
          description,
          severity: severity as any,
          status: "open",
          organizationId: payload.organizationId,
          ticketType: "MAINTENANCE_TICKET",
          deviceType: payload.deviceType,
          deviceId: payload.deviceId,
        },
      });

      this.eventEmitter.emit("maintenance.ticket-created", ticket);
      this.logger.log(`Maintenance ticket created for ${payload.deviceType} ${payload.deviceId}: ${payload.status}`);

      return this.toTicketDto(ticket);
    } catch (err: any) {
      this.logger.error(`Failed to create maintenance ticket from equipment.alert: ${err.message}`);
      return null;
    }
  }

  /**
   * Auto-create a maintenance ticket when prediction.triggered is emitted (Plan 04 integration).
   */
  @OnEvent("prediction.triggered", { async: true })
  async onPredictionTriggered(payload: {
    deviceType: string;
    deviceId: string;
    metric: string;
    hoursToFailure: number;
    organizationId: string;
    deviceName?: string;
  }): Promise<MaintenanceTicketDto | null> {
    try {
      // Dedup: check for existing unresolved tickets for the same device
      const existing = await this.prisma.incident.findFirst({
        where: {
          ticketType: "MAINTENANCE_TICKET",
          deviceId: payload.deviceId,
          status: { in: ["open", "in_progress"] },
        },
      });
      if (existing) return null;

      const ticket = await this.prisma.incident.create({
        data: {
          title: `PRÉDICTION — ${payload.deviceType} ${payload.metric} failure expected in ${Math.round(payload.hoursToFailure)}h`,
          description: `Predictive alert: ${payload.deviceType} ${payload.deviceId} — ${payload.metric} will likely fail within ${Math.round(payload.hoursToFailure)} hours.`,
          severity: payload.hoursToFailure <= 24 ? "HIGH" as any : "MEDIUM" as any,
          status: "open",
          organizationId: payload.organizationId,
          ticketType: "MAINTENANCE_TICKET",
          deviceType: payload.deviceType,
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
        },
      });

      this.eventEmitter.emit("maintenance.ticket-created", ticket);
      this.logger.log(`Maintenance ticket created from prediction: ${payload.deviceType} ${payload.deviceId} — ${payload.metric}`);

      return this.toTicketDto(ticket);
    } catch (err: any) {
      this.logger.error(`Failed to create maintenance ticket from prediction: ${err.message}`);
      return null;
    }
  }

  /**
   * Manually create a maintenance ticket (ADMIN/SUPERVISOR).
   */
  async createManualTicket(dto: CreateMaintenanceTicketInput, userId: string): Promise<MaintenanceTicketDto> {
    const ticket = await this.prisma.incident.create({
      data: {
        title: dto.title,
        description: dto.description,
        severity: dto.severity as any,
        status: "open",
        organizationId: dto.organizationId,
        ticketType: "MAINTENANCE_TICKET",
        deviceType: dto.deviceType,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        assignedToId: userId,
        assignedAt: new Date(),
      },
    });

    this.eventEmitter.emit("maintenance.ticket-created", ticket);
    return this.toTicketDto(ticket);
  }

  /**
   * List maintenance tickets with optional filters and pagination.
   */
  async listTickets(params: MaintenanceQueryInput): Promise<{ data: MaintenanceTicketDto[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { ticketType: "MAINTENANCE_TICKET" };
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.deviceType) where.deviceType = params.deviceType;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: data.map((t) => this.toTicketDto(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single maintenance ticket by ID.
   */
  async getTicket(id: string): Promise<MaintenanceTicketDto> {
    const ticket = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!ticket || ticket.ticketType !== "MAINTENANCE_TICKET") {
      throw new NotFoundException("Maintenance ticket not found");
    }

    return this.toTicketDto(ticket);
  }

  /**
   * Get unified incidents list — both SECURITY_INCIDENT and MAINTENANCE_TICKET (WFL-03).
   */
  async getUnifiedIncidents(params: {
    organizationId?: string;
    ticketType?: string;
    status?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: UnifiedIncidentDto[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.ticketType) where.ticketType = params.ticketType;
    if (params.status) where.status = params.status;
    if (params.severity) where.severity = params.severity;

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: data.map((t) => this.toUnifiedDto(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Assign a maintenance ticket to a user.
   */
  async assignTicket(id: string, userId: string, currentUser: any): Promise<MaintenanceTicketDto> {
    const ticket = await this.prisma.incident.findUnique({ where: { id } });
    if (!ticket || ticket.ticketType !== "MAINTENANCE_TICKET") {
      throw new NotFoundException("Maintenance ticket not found");
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        assignedToId: userId,
        assignedAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.eventEmitter.emit("maintenance.ticket-assigned", { ticketId: id, userId, assignedBy: currentUser.id });
    return this.toTicketDto(updated);
  }

  /**
   * Transition a maintenance ticket's status.
   */
  async transitionTicketStatus(id: string, newStatus: string, _user: any): Promise<MaintenanceTicketDto> {
    const ticket = await this.prisma.incident.findUnique({ where: { id } });
    if (!ticket || ticket.ticketType !== "MAINTENANCE_TICKET") {
      throw new NotFoundException("Maintenance ticket not found");
    }

    // Validate transition via state machine
    this.incidentStateMachine.validateTransition(ticket.status, newStatus, "MAINTENANCE_TICKET");

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === "closed" ? { closedAt: new Date() } : {}),
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.toTicketDto(updated);
  }

  // ─── DTO Mappers ───

  private toTicketDto(ticket: any): MaintenanceTicketDto {
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description ?? undefined,
      severity: ticket.severity,
      status: ticket.status,
      organizationId: ticket.organizationId,
      assignedToId: ticket.assignedToId ?? undefined,
      assignedToName: ticket.assignedTo
        ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
        : undefined,
      deviceType: ticket.deviceType ?? undefined,
      deviceId: ticket.deviceId ?? undefined,
      deviceName: ticket.deviceName ?? undefined,
      createdAt: ticket.createdAt?.toISOString?.() ?? ticket.createdAt,
      updatedAt: ticket.updatedAt?.toISOString?.() ?? ticket.updatedAt,
      closedAt: ticket.closedAt?.toISOString?.() ?? undefined,
    };
  }

  private toUnifiedDto(ticket: any): UnifiedIncidentDto {
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description ?? undefined,
      severity: ticket.severity,
      status: ticket.status,
      ticketType: ticket.ticketType === "MAINTENANCE_TICKET" ? "MAINTENANCE_TICKET" : "SECURITY_INCIDENT",
      organizationId: ticket.organizationId,
      siteName: ticket.organization?.name ?? undefined,
      assignedToName: ticket.assignedTo
        ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
        : undefined,
      deviceType: ticket.deviceType ?? undefined,
      deviceName: ticket.deviceName ?? undefined,
      createdAt: ticket.createdAt?.toISOString?.() ?? ticket.createdAt,
    };
  }
}
