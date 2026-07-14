import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

@Processor("incident-alerts")
export class IncidentProcessor extends WorkerHost {
  private readonly logger = new Logger(IncidentProcessor.name);

  constructor(private prisma: PrismaService) {
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

  private async handleAutoTriage(data: { alertId: string; severity: string; metadata?: any }) {
    this.logger.log(`Auto-triage for alert ${data.alertId}`);
    return { skipped: true, reason: "not-implemented" };
  }

  private async handleSlaEscalation(data: { incidentId: string; level: number; notifyUserId?: string }) {
    this.logger.log(`SLA escalation for incident ${data.incidentId}`);
    return { skipped: true, reason: "not-implemented" };
  }
}
