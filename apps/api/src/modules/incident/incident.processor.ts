import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";

@Processor("incident-alerts")
export class IncidentProcessor extends WorkerHost {
  private readonly logger = new Logger(IncidentProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "auto-triage":
        return this.handleAutoTriage(job.data);
      case "sla-escalation":
        return this.handleSlaEscalation(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Auto-triage: Convert HIGH/CRITICAL alerts into incidents.
   * Follows Pattern 2 from RESEARCH.md.
   */
  private async handleAutoTriage(data: { alertId: string; severity: string; metadata?: any }) {
    // Fetch alert with camera relation for site info
    const alert = await this.prisma.alert.findUnique({
      where: { id: data.alertId },
      include: {
        camera: { select: { id: true, name: true, orgId: true } },
      },
    });

    if (!alert) {
      this.logger.warn(`Auto-triage skipped: alert ${data.alertId} not found`);
      return { skipped: true, reason: "alert-not-found" };
    }

    // Create incident from alert
    const incident = await this.prisma.incident.create({
      data: {
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: "open",
        sourceType: "alert",
        sourceId: alert.id,
        orgId: alert.camera.orgId,
        slaMinutes: 30,
        escalationChain: [
          { level: 1, slaMinutes: 30, notifyRole: "SUPERVISOR" },
          { level: 2, slaMinutes: 60, notifyRole: "ADMIN" },
        ],
      },
    });

    // Log to incident_events hypertable
    try {
      await this.prisma.$queryRaw`
        INSERT INTO incident_events (time, incident_id, organization_id, status, previous_status, triggered_by, metadata)
        VALUES (
          NOW(),
          ${incident.id}::uuid,
          ${alert.camera.orgId}::uuid,
          'open'::incident_status,
          NULL::incident_status,
          'auto-triage',
          ${JSON.stringify({ alertId: alert.id, cameraName: alert.camera.name })}::jsonb
        )
      `;
    } catch (err: any) {
      this.logger.warn(`Failed to log incident event: ${err.message}`);
    }

    // Emit event
    this.eventEmitter.emit("incident.created", {
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      orgId: incident.orgId,
      sourceType: "alert",
      sourceId: alert.id,
      createdAt: incident.createdAt.toISOString(),
    });

    this.logger.log(`Auto-triaged alert ${alert.id} → incident ${incident.id}`);
    return { created: true, incidentId: incident.id };
  }

  /**
   * SLA escalation: Handle delayed escalation when SLA is breached.
   */
  private async handleSlaEscalation(data: { incidentId: string; level: number; notifyUserId?: string }) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: data.incidentId },
      select: { id: true, status: true, orgId: true, title: true },
    });

    if (!incident) {
      return { skipped: true, reason: "incident-not-found" };
    }

    if (incident.status === "resolved" || incident.status === "closed") {
      return { skipped: true, reason: "already-resolved" };
    }

    // Log escalation to incident_events
    try {
      await this.prisma.$queryRaw`
        INSERT INTO incident_events (time, incident_id, organization_id, status, previous_status, triggered_by, metadata)
        VALUES (
          NOW(),
          ${incident.id}::uuid,
          ${incident.orgId}::uuid,
          ${incident.status}::incident_status,
          ${incident.status}::incident_status,
          'escalation',
          ${JSON.stringify({ level: data.level })}::jsonb
        )
      `;
    } catch (err: any) {
      this.logger.warn(`Failed to log escalation event: ${err.message}`);
    }

    // Emit escalation event
    this.eventEmitter.emit("incident.escalated", {
      incidentId: incident.id,
      title: incident.title,
      orgId: incident.orgId,
      level: data.level,
      notifyUserId: data.notifyUserId,
      triggeredAt: new Date().toISOString(),
    });

    this.logger.warn(`SLA escalation level ${data.level} for incident ${incident.id}`);
    return { escalated: true, incidentId: incident.id, level: data.level };
  }
}
