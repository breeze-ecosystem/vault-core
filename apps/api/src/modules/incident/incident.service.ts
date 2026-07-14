import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { IncidentStateMachine } from "./incident-state-machine";
import Redis from "ioredis";
import PDFDocument from "pdfkit";
import Handlebars from "handlebars";

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
          _count: { select: { comments: true, evidence: true } },
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
        _count: { select: { comments: true, evidence: true } },
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

  // ── Evidence Operations ──

  async addEvidence(
    incidentId: string,
    dto: {
      type: string;
      url?: string;
      eventType?: string;
      eventId?: string;
      description?: string;
    },
    userId: string,
  ) {
    // Verify incident exists
    await this.findById(incidentId);

    const evidence = await this.prisma.incidentEvidence.create({
      data: {
        incidentId,
        type: dto.type,
        url: dto.url ?? null,
        eventType: dto.eventType ?? null,
        eventId: dto.eventId ?? null,
        description: dto.description ?? null,
        uploadedById: userId,
      },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Evidence added to incident ${incidentId} by user ${userId}`);
    return {
      id: evidence.id,
      incidentId: evidence.incidentId,
      type: evidence.type,
      url: evidence.url,
      eventType: evidence.eventType,
      eventId: evidence.eventId,
      description: evidence.description,
      uploadedById: evidence.uploadedById,
      uploaderName: evidence.uploadedBy
        ? `${evidence.uploadedBy.firstName} ${evidence.uploadedBy.lastName}`
        : null,
      createdAt: evidence.createdAt.toISOString(),
    };
  }

  async removeEvidence(incidentId: string, evidenceId: string) {
    // Verify evidence belongs to the incident
    const evidence = await this.prisma.incidentEvidence.findFirst({
      where: { id: evidenceId, incidentId },
    });

    if (!evidence) {
      throw new NotFoundException("Evidence not found for this incident");
    }

    await this.prisma.incidentEvidence.delete({
      where: { id: evidenceId },
    });

    this.logger.log(`Evidence ${evidenceId} removed from incident ${incidentId}`);
  }

  async getEvidence(incidentId: string) {
    // Verify incident exists
    await this.findById(incidentId);

    const evidenceList = await this.prisma.incidentEvidence.findMany({
      where: { incidentId },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return evidenceList.map((e) => ({
      id: e.id,
      incidentId: e.incidentId,
      type: e.type,
      url: e.url,
      eventType: e.eventType,
      eventId: e.eventId,
      description: e.description,
      uploadedById: e.uploadedById,
      uploaderName: e.uploadedBy
        ? `${e.uploadedBy.firstName} ${e.uploadedBy.lastName}`
        : null,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  async generateClosureReport(incidentId: string): Promise<Buffer> {
    // Fetch incident with all relations
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
        evidence: {
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
        assignments: {
          include: {
            assignedBy: { select: { firstName: true, lastName: true } },
            assignedTo: { select: { firstName: true, lastName: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!incident) throw new NotFoundException("Incident not found");

    // Fetch status history from incident_events hypertable
    let statusHistory: Array<{
      time: string;
      status: string;
      previous_status: string | null;
      triggered_by: string | null;
    }> = [];

    try {
      const rows = await this.prisma.$queryRaw<Array<{
        time: Date;
        status: string;
        previous_status: string | null;
        triggered_by: string | null;
      }>>`
        SELECT time, status, previous_status, triggered_by
        FROM incident_events
        WHERE incident_id = ${incidentId}::uuid
        ORDER BY time ASC
      `;
      statusHistory = rows.map((r: any) => ({
        time: r.time instanceof Date ? r.time.toISOString() : String(r.time),
        status: r.status,
        previous_status: r.previous_status,
        triggered_by: r.triggered_by,
      }));
    } catch (err: any) {
      this.logger.warn(`Could not query incident_events for report: ${err.message}`);
    }

    // Compile report context
    const severityLabels: Record<string, string> = {
      CRITICAL: "Critique",
      HIGH: "Haute",
      MEDIUM: "Moyenne",
      LOW: "Basse",
      INFO: "Info",
    };

    const createdDate = new Date(incident.createdAt);
    const closedDate = incident.closedAt ? new Date(incident.closedAt) : null;
    const now = new Date();
    const endTime = closedDate || now;
    const durationMs = endTime.getTime() - createdDate.getTime();
    const durationHours = Math.floor(durationMs / 3600000);
    const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
    const durationStr = durationHours > 0
      ? `${durationHours}h ${durationMinutes}min`
      : `${durationMinutes}min`;

    const reportContext = {
      incident: {
        id: incident.id,
        title: incident.title,
        description: incident.description || "Aucune description",
        severity: incident.severity,
        status: incident.status,
        createdAt: createdDate.toISOString().split("T")[0],
        closedAt: closedDate ? closedDate.toISOString().split("T")[0] : "N/A",
        slaMinutes: incident.slaMinutes,
      },
      assignee: incident.assignedTo
        ? {
            firstName: incident.assignedTo.firstName,
            lastName: incident.assignedTo.lastName,
            email: incident.assignedTo.email,
          }
        : null,
      severityLabel: severityLabels[incident.severity] || incident.severity,
      duration: durationStr,
      statusHistory: statusHistory.map((h) => ({
        time: new Date(h.time).toLocaleString("fr-FR"),
        status: h.status,
        previousStatus: h.previous_status || "N/A",
        triggeredBy: h.triggered_by || "système",
      })),
      comments: incident.comments.map((c) => ({
        author: c.user ? `${c.user.firstName} ${c.user.lastName}` : "Inconnu",
        text: c.text,
        createdAt: c.createdAt.toLocaleString("fr-FR"),
      })),
      evidence: incident.evidence.map((e) => ({
        type: e.type,
        url: e.url || "N/A",
        description: e.description || "Aucune description",
        createdAt: e.createdAt.toISOString().split("T")[0],
        uploader: e.uploadedBy
          ? `${e.uploadedBy.firstName} ${e.uploadedBy.lastName}`
          : "Inconnu",
      })),
    };

    // Compile Handlebars template
    const templateSource = `
      <h1>Rapport de Clôture d'Incident</h1>
      <h2>{{incident.title}}</h2>
      <p><strong>ID:</strong> {{incident.id}}</p>
      <p><strong>Sévérité:</strong> {{severityLabel}}</p>
      <p><strong>Statut final:</strong> {{incident.status}}</p>
      <p><strong>Créé le:</strong> {{incident.createdAt}}</p>
      <p><strong>Fermé le:</strong> {{incident.closedAt}}</p>
      <p><strong>Durée:</strong> {{duration}}</p>
      {{#if assignee}}
      <p><strong>Assigné à:</strong> {{assignee.firstName}} {{assignee.lastName}} ({{assignee.email}})</p>
      {{/if}}
      <h3>Chronologie</h3>
      <ul>
      {{#each statusHistory}}
        <li>{{this.time}} — <strong>{{this.previousStatus}}</strong> → <strong>{{this.status}}</strong> ({{this.triggeredBy}})</li>
      {{/each}}
      </ul>
      <h3>Commentaires</h3>
      {{#each comments}}
      <div>
        <strong>{{this.author}}</strong> <em>{{this.createdAt}}</em>
        <p>{{this.text}}</p>
      </div>
      {{/each}}
      <h3>Preuves</h3>
      <ul>
      {{#each evidence}}
        <li>{{this.type}}: {{this.description}} ({{this.createdAt}}) — par {{this.uploader}}</li>
      {{/each}}
      </ul>
      <hr />
      <p><em>Généré le {{generatedAt}}</em></p>
    `;

    const template = Handlebars.compile(templateSource);
    const html = template({ ...reportContext, generatedAt: new Date().toLocaleString("fr-FR") });

    // Generate PDF
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Render structured PDF content
      doc.fontSize(20).font("Helvetica-Bold").text("Rapport de Clôture d'Incident", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text(`#${incident.id.substring(0, 8)} — ${incident.title}`);
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Sévérité: ${severityLabels[incident.severity] || incident.severity}    Statut: ${incident.status}    Créé: ${createdDate.toISOString().split("T")[0]}`);
      doc.moveDown();

      // Description
      doc.fontSize(12).font("Helvetica-Bold").text("Description");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").text(incident.description || "Aucune description");
      doc.moveDown();

      // Assignee
      if (incident.assignedTo) {
        doc.fontSize(12).font("Helvetica-Bold").text("Assigné à");
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica").text(`${incident.assignedTo.firstName} ${incident.assignedTo.lastName} (${incident.assignedTo.email})`);
        doc.moveDown();
      }

      // Duration
      doc.fontSize(12).font("Helvetica-Bold").text("Durée");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").text(durationStr);
      doc.moveDown();

      // Status History
      doc.fontSize(12).font("Helvetica-Bold").text("Chronologie des statuts");
      doc.moveDown(0.3);
      if (statusHistory.length === 0) {
        doc.fontSize(10).font("Helvetica").text("Aucun historique disponible");
      } else {
        for (const h of statusHistory) {
          doc.fontSize(10).font("Helvetica").text(
            `${new Date(h.time).toLocaleString("fr-FR")} — ${h.previous_status || "N/A"} → ${h.status} (${h.triggered_by || "système"})`,
          );
        }
      }
      doc.moveDown();

      // Comments
      doc.fontSize(12).font("Helvetica-Bold").text("Commentaires");
      doc.moveDown(0.3);
      if (incident.comments.length === 0) {
        doc.fontSize(10).font("Helvetica").text("Aucun commentaire");
      } else {
        for (const c of incident.comments) {
          doc.fontSize(10).font("Helvetica-Bold").text(
            `${c.user ? `${c.user.firstName} ${c.user.lastName}` : "Inconnu"} — ${c.createdAt.toLocaleString("fr-FR")}`,
          );
          doc.fontSize(10).font("Helvetica").text(c.text);
          doc.moveDown(0.5);
        }
      }

      // Evidence
      doc.fontSize(12).font("Helvetica-Bold").text("Preuves");
      doc.moveDown(0.3);
      if (incident.evidence.length === 0) {
        doc.fontSize(10).font("Helvetica").text("Aucune preuve attachée");
      } else {
        for (const e of incident.evidence) {
          const uploader = e.uploadedBy
            ? `${e.uploadedBy.firstName} ${e.uploadedBy.lastName}`
            : "Inconnu";
          doc.fontSize(10).font("Helvetica").text(
            `[${e.type}] ${e.description || "Sans description"} — ${e.createdAt.toISOString().split("T")[0]} — par ${uploader}`,
          );
        }
      }

      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica-Oblique").text(
        `Généré le ${new Date().toLocaleString("fr-FR")} — OVERSIGHT AI`,
        { align: "center" },
      );

      doc.end();
    });
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
