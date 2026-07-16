import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { TenantApiKeyGuard } from "./guards/tenant-api-key.guard";

/**
 * V1 — Public REST API for enterprise integrations.
 *
 * All routes are authenticated via X-API-Key header (TenantApiKeyGuard).
 * The organization context is derived from the API key's organizationId
 * (attached to request.apiKeyInfo by TenantApiKeyGuard).
 *
 * Endpoint surface:
 * - Cameras: read-only
 * - Doors: read + control
 * - Alerts: read + acknowledge
 * - Incidents: read + status update
 * - Events: read/search (audit log)
 * - Audit: read-only
 */
@ApiTags("v1")
@Controller("v1")
@UseGuards(TenantApiKeyGuard)
@ApiHeader({
  name: "X-API-Key",
  description: "Tenant API key (osk_ prefix)",
  required: true,
})
export class V1Controller {
  constructor(private prisma: PrismaService) {}

  // ── Cameras (read-only) ──────────────────────────────────────────────────

  @Get("cameras")
  @ApiOperation({ summary: "List all cameras (read-only)" })
  async listCameras(@Req() req: FastifyRequest) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    return this.prisma.camera.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        status: true,
        rtspUrl: false,
        resolution: true,
        fps: true,
        isRecording: true,
        lastSnapshotUrl: true,
        lastHeartbeat: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  @Get("cameras/:id")
  @ApiOperation({ summary: "Get a single camera (read-only)" })
  async getCamera(@Req() req: FastifyRequest, @Param("id") id: string) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const camera = await this.prisma.camera.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        name: true,
        status: true,
        resolution: true,
        fps: true,
        isRecording: true,
        lastSnapshotUrl: true,
        lastHeartbeat: true,
        createdAt: true,
      },
    });
    if (!camera) return { error: "Camera not found" };
    return camera;
  }

  // ── Doors (read + control) ─────────────────────────────────────────────

  @Get("doors")
  @ApiOperation({ summary: "List all doors (read-only)" })
  async listDoors(@Req() req: FastifyRequest) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    return this.prisma.door.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        zoneId: true,
        location: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  @Post("doors/:id/control")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Control a door (open/close/lock)" })
  async controlDoor(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
  ) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const door = await this.prisma.door.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!door) return { error: "Door not found" };
    // TODO: delegate to DoorService.remoteControl() in full implementation
    return { success: true, message: `Door ${id} control command received` };
  }

  // ── Alerts (read + acknowledge) ──────────────────────────────────────────

  @Get("alerts")
  @ApiOperation({ summary: "List alerts (read-only)" })
  async listAlerts(
    @Req() req: FastifyRequest,
    @Query("status") status?: string,
    @Query("severity") severity?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          status: true,
          cameraId: true,
          snapshotUrl: true,
          createdAt: true,
          acknowledgedAt: true,
        },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { data, total, page: pageNum, limit: limitNum };
  }

  @Post("alerts/:id/acknowledge")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Acknowledge an alert" })
  async acknowledgeAlert(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
  ) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const alert = await this.prisma.alert.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!alert) return { error: "Alert not found" };

    await this.prisma.alert.update({
      where: { id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });

    return { success: true, message: "Alert acknowledged" };
  }

  // ── Incidents (read + status update) ───────────────────────────────────

  @Get("incidents")
  @ApiOperation({ summary: "List incidents (read-only)" })
  async listIncidents(
    @Req() req: FastifyRequest,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          status: true,
          sourceType: true,
          assignedToId: true,
          createdAt: true,
          closedAt: true,
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return { data, total, page: pageNum, limit: limitNum };
  }

  @Patch("incidents/:id/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update incident status" })
  async updateIncidentStatus(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
  ) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const incident = await this.prisma.incident.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!incident) return { error: "Incident not found" };
    // TODO: full validation via Zod schema in production
    return { success: true, message: `Incident ${id} status updated` };
  }

  // ── Events (read/search — audit log) ──────────────────────────────────

  @Get("events")
  @ApiOperation({ summary: "Search events (audit log, read-only)" })
  async searchEvents(
    @Req() req: FastifyRequest,
    @Query("action") action?: string,
    @Query("entity") entity?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const where: Record<string, unknown> = { organizationId: orgId };
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          changes: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page: pageNum, limit: limitNum };
  }

  // ── Audit (read-only) ──────────────────────────────────────────────────

  @Get("audit")
  @ApiOperation({ summary: "List audit log entries (read-only)" })
  async listAudit(
    @Req() req: FastifyRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const orgId = (req as any).apiKeyInfo.organizationId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          changes: true,
          userId: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where: { organizationId: orgId } }),
    ]);

    return { data, total, page: pageNum, limit: limitNum };
  }
}
