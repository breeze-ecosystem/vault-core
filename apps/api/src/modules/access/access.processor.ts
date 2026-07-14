import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

export interface PersistEventJob {
  time: Date;
  siteId: string;
  doorId: string;
  credentialId: string;
  userId: string;
  decision: string;
  reason: string;
  sequence?: number;
}

@Processor("access-events")
export class AccessProcessor extends WorkerHost {
  private readonly logger = new Logger(AccessProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<PersistEventJob, any, string>): Promise<any> {
    switch (job.name) {
      case "persist-event":
        return this.persistEvent(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * D-16: Writes access event to TimescaleDB hypertable via $queryRaw.
   * Never use Prisma model for time-series data.
   */
  private async persistEvent(data: PersistEventJob) {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO access_events (time, site_id, door_id, credential_id, user_id, decision, reason, sequence)
        VALUES (${data.time}, ${data.siteId}::uuid, ${data.doorId}::uuid,
                ${data.credentialId}::uuid, ${data.userId}::uuid,
                ${data.decision}::event_decision, ${data.reason}, ${data.sequence})
      `;
      this.logger.log(`Access event persisted: ${data.decision} for credential ${data.credentialId}`);
    } catch (err: any) {
      this.logger.error(`Failed to persist access event: ${err.message}`);
      throw err;
    }
  }
}
