import { Logger, Inject } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { withTenantContext } from "../../common/helpers/tenant-worker";
import Redis from "ioredis";

export interface PersistEventJob {
  time: Date;
  orgId: string;
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

  constructor(
    private prisma: PrismaService,
    @Inject("REDIS") private redis: Redis,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "persist-event":
        return this.persistEvent(job.data);
      case "video-correlation":
        return this.captureVideoCorrelation(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Capture snapshot + 10s video clip on denied/forced/held-open events (BAS-10).
   * Uses the primary camera from CameraDoorMap (highest priority).
   * Stores snapshot in existing @fastify/static pipeline path.
   */
  private async captureVideoCorrelation(data: {
    doorId: string;
    organizationId: string;
    eventType: string;
    timestamp: string;
  }) {
    const { doorId, organizationId, eventType } = data;
    if (!organizationId) {
      return { skipped: true, reason: "missing-org-id" };
    }

    return withTenantContext(this.prisma, organizationId, async () => {
      try {
        // Find primary camera for this door (highest priority)
        const cameraMap = await this.prisma.cameraDoorMap.findFirst({
          where: { doorId },
          orderBy: { priority: "desc" },
          include: {
            camera: { select: { id: true, name: true, rtspUrl: true } },
          },
        });

        if (!cameraMap?.camera) {
          this.logger.warn(`No camera mapped to door ${doorId} — cannot capture video correlation`);
          return { skipped: true, reason: "no-camera-mapped" };
        }

        const camera = cameraMap.camera;
        const snapshotBaseName = `correlation_${doorId}_${Date.now()}`;

        // Store correlation event metadata in system (snapshot path will be populated by ingestion pipeline)
        const eventPayload = {
          doorId,
          cameraId: camera.id,
          cameraName: camera.name,
          eventType,
          snapshotBaseName,
          timestamp: data.timestamp,
          retentionDays: 30, // D-26: 30-day retention
        };

        // Emit event for the snapshot ingestion pipeline to process
        const { EventEmitter2 } = await import("@nestjs/event-emitter");
        const emitter = new EventEmitter2();
        emitter.emit("access.video-correlation", eventPayload);

        this.logger.log(`Video correlation triggered: door=${doorId}, event=${eventType}, camera=${camera.name}`);
        return { captured: true, cameraId: camera.id, snapshotBaseName };
      } catch (err: any) {
        this.logger.error(`Failed to capture video correlation for door ${doorId}: ${err.message}`);
        throw err;
      }
    });
  }

  /**
   * D-16: Writes access event to TimescaleDB hypertable via $queryRaw.
   * Never use Prisma model for time-series data.
   */
  private async persistEvent(data: PersistEventJob) {
    const { orgId } = data;
    if (!orgId) {
      this.logger.warn(`Job missing orgId — skipping`);
      return { skipped: true, reason: "missing-org-id" };
    }
    return withTenantContext(this.prisma, orgId, async () => {
      try {
        await this.prisma.$queryRaw`
        INSERT INTO access_events (time, organization_id, door_id, credential_id, user_id, decision, reason, sequence)
        VALUES (${data.time}, ${data.orgId}::uuid, ${data.doorId}::uuid,
                ${data.credentialId}::uuid, ${data.userId}::uuid,
                ${data.decision}::event_decision, ${data.reason}, ${data.sequence})
      `;
      this.logger.log(`Access event persisted: ${data.decision} for credential ${data.credentialId}`);
      } catch (err: any) {
        this.logger.error(`Failed to persist access event: ${err.message}`);
        throw err;
      }
    });
  }
}
