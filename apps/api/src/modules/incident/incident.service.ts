import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { IncidentStateMachine } from "./incident-state-machine";
import Redis from "ioredis";

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);
  private readonly stateMachine = new IncidentStateMachine();

  constructor(
    private prisma: PrismaService,
    @Inject("REDIS_INCIDENT") private redis: Redis,
    @InjectQueue("incident-alerts") private incidentQueue: Queue,
  ) {}

  // ── Lifecycle Hooks ──

  /**
   * On server startup, re-evaluate all open incidents' SLA timers.
   * This handles Pitfall 1: SLA timer loss on server restart.
   */
  async onModuleInit() {
    try {
      const activeIncidents = await this.prisma.incident.findMany({
        where: {
          status: { notIn: ["resolved", "closed"] },
          assignedToId: { not: null },
        },
        select: { id: true, assignedAt: true, slaMinutes: true, escalationChain: true },
      });

      for (const incident of activeIncidents) {
        if (!incident.assignedAt) continue;

        const elapsed = Date.now() - new Date(incident.assignedAt).getTime();
        const slaMs = incident.slaMinutes * 60 * 1000;

        if (elapsed >= slaMs) {
          // SLA already breached — escalate immediately
          this.logger.warn(`SLA breached for incident ${incident.id} during startup re-evaluation`);
          await this.incidentQueue.add("sla-escalation", {
            incidentId: incident.id,
            level: 1,
          });
        } else {
          // Schedule remaining time
          const remaining = slaMs - elapsed;
          await this.incidentQueue.add("sla-escalation", {
            incidentId: incident.id,
            level: 1,
          }, { delay: remaining });
          this.logger.log(`SLA timer rescheduled for incident ${incident.id} (${Math.round(remaining / 60000)}min remaining)`);
        }
      }

      if (activeIncidents.length > 0) {
        this.logger.log(`Re-evaluated SLA timers for ${activeIncidents.length} active incidents`);
      }
    } catch (err: any) {
      this.logger.error(`SLA re-evaluation on startup failed: ${err.message}`);
    }
  }

  // ── CRUD Operations ──

  async create(dto: {
    title: string;
    description?: string;
    severity: string;
    siteId: string;
    sourceType?: string;
    sourceId?: string;
  }, userId: string) {
    const incident = await this.prisma.incident.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        severity: dto.severity as any,
        siteId: dto.siteId,
        sourceType: dto.sourceType ?? "manual",
        sourceId: dto.sourceId ?? null,
        slaMinutes: 30,
        escalationChain: [
          { level: 1, slaMinutes: 30, notifyRole: "SUPERVISOR" },
          { level: 2, slaMinutes: 60, notifyRole: "ADMIN" },
        ],
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Log to incident_events hypertable
    await this.logStatusTransition(incident.id, incident.siteId, "open", null, "system");

    this.logger.log(`Incident created: ${incident.id} — ${incident.title}`);
    return incident;
  }

  async findAll(filters: {
    status?: string;
    severity?: string;
    assignedToId?: string;
    siteId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Record<string, any> = {};
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.siteId) where.siteId = filters.siteId;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
        assignments: {
          include: {
            assignedBy: { select: { firstName: true, lastName: true } },
            assignedTo: { select: { firstName: true, lastName: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
        _count: { select: { comments: true } },
      },
    });

    if (!incident) throw new NotFoundException("Incident not found");
    return incident;
  }

  async transitionStatus(id: string, newStatus: string, reason: string | undefined, userId: string) {
    const incident = await this.findById(id);

    // Validate through state machine
    this.stateMachine.validateTransition(incident.status, newStatus);

    const updateData: Record<string, any> = { status: newStatus };
    if (newStatus === "closed") {
      updateData.closedAt = new Date();
    }
    if (newStatus === "investigating" && incident.status === "resolved") {
      updateData.closedAt = null;
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Log to incident_events hypertable
    await this.logStatusTransition(id, incident.siteId, newStatus, incident.status, userId);

    this.logger.log(`Incident ${id} status changed: ${incident.status} → ${newStatus}`);
    return updated;
  }

  // ── Assignment ──

  async assignIncident(id: string, userId: string, assignedBy: string, note?: string) {
    const incident = await this.findById(id);

    // Create assignment record
    const assignment = await this.prisma.incidentAssignment.create({
      data: {
        incidentId: id,
        assignedById: assignedBy,
        assignedToId: userId,
        note: note ?? null,
      },
      include: {
        assignedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });

    // Update incident: set assignedTo, auto-transition to TRIAGE if OPEN
    const updateData: Record<string, any> = {
      assignedToId: userId,
      assignedAt: new Date(),
    };
    if (incident.status === "open") {
      updateData.status = "triage";
    }

    await this.prisma.incident.update({
      where: { id },
      data: updateData,
    });

    // Schedule SLA escalation jobs
    const slaMinutes = incident.slaMinutes;
    const escalationChain = (incident.escalationChain as any[]) || [];
    for (const level of escalationChain) {
      const delay = (level.slaMinutes || slaMinutes) * 60 * 1000;
      await this.incidentQueue.add("sla-escalation", {
        incidentId: id,
        level: level.level,
        notifyUserId: level.notifyUserId ?? null,
      }, { delay });
    }

    this.logger.log(`Incident ${id} assigned to user ${userId}`);
    return assignment;
  }

  // ── Comments ──

  async addComment(id: string, text: string, userId: string) {
    // Verify incident exists
    await this.findById(id);

    const comment = await this.prisma.incidentComment.create({
      data: {
        incidentId: id,
        userId,
        text,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Comment added to incident ${id} by user ${userId}`);
    return comment;
  }

  async getComments(id: string) {
    // Verify incident exists
    await this.findById(id);

    return this.prisma.incidentComment.findMany({
      where: { incidentId: id },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async getAssignmentHistory(id: string) {
    // Verify incident exists
    await this.findById(id);

    return this.prisma.incidentAssignment.findMany({
      where: { incidentId: id },
      include: {
        assignedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
  }

  async getStatusHistory(id: string) {
    // Verify incident exists
    await this.findById(id);

    // Query from TimescaleDB hypertable
    try {
      const rows = await this.prisma.$queryRaw<Array<{
        time: Date;
        status: string;
        previous_status: string | null;
        triggered_by: string | null;
        metadata: any;
      }>>`
        SELECT time, status, previous_status, triggered_by, metadata
        FROM incident_events
        WHERE incident_id = ${id}::uuid
        ORDER BY time ASC
      `;

      return rows.map((row) => ({
        time: row.time.toISOString(),
        status: row.status,
        previous_status: row.previous_status,
        triggered_by: row.triggered_by,
        metadata: row.metadata,
      }));
    } catch (err: any) {
      this.logger.warn(`Could not query incident_events: ${err.message}`);
      return [];
    }
  }

  // ── Event Bus Listener (Part H) ──

  @OnEvent("alert.created", { async: true })
  async handleAlertCreated(payload: {
    id: string;
    title: string;
    description?: string;
    severity: string;
    cameraId: string;
    siteId: string;
    metadata?: any;
  }) {
    // T-02-03: Only HIGH and CRITICAL severity triggers auto-triage
    if (payload.severity !== "HIGH" && payload.severity !== "CRITICAL") {
      return;
    }

    // T-02-03: Redis dedup — skip if already processed within last hour
    const dedupKey = `incident:autotriage:dedup:${payload.id}`;
    const alreadyProcessed = await this.redis.get(dedupKey);
    if (alreadyProcessed) {
      this.logger.debug(`Auto-triage skipped for alert ${payload.id} (already processed)`);
      return;
    }

    // Set dedup key with 1-hour TTL
    await this.redis.setex(dedupKey, 3600, "1");

    // Enqueue auto-triage job
    await this.incidentQueue.add("auto-triage", {
      alertId: payload.id,
      severity: payload.severity,
      metadata: payload.metadata,
    });

    this.logger.log(`Auto-triage job enqueued for alert ${payload.id}`);
  }

  // ── Private Helpers ──

  private async logStatusTransition(
    incidentId: string,
    siteId: string,
    status: string,
    previousStatus: string | null,
    triggeredBy: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO incident_events (time, incident_id, site_id, status, previous_status, triggered_by, metadata)
        VALUES (
          NOW(),
          ${incidentId}::uuid,
          ${siteId}::uuid,
          ${status}::incident_status,
          ${previousStatus ?? null}::incident_status,
          ${triggeredBy},
          ${metadata ? JSON.stringify(metadata) : null}::jsonb
        )
      `;
    } catch (err: any) {
      this.logger.warn(`Failed to log incident event to TimescaleDB: ${err.message}`);
    }
  }
}
