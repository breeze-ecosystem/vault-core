import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import type { CorrelationJob } from "@repo/shared";
import { withTenantContext } from "../../common/helpers/tenant-worker";

/**
 * CorrelationProcessor — D-13 async video correlation worker.
 * Runs AFTER access decisions are returned. Never blocks the door.
 */
@Processor("video-correlation")
export class CorrelationProcessor extends WorkerHost {
  private readonly logger = new Logger(CorrelationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<CorrelationJob, any, string>): Promise<any> {
    switch (job.name) {
      case "correlate-video":
        return this.correlateVideo(job.data);
      default:
        this.logger.warn(`Unknown correlation job: ${job.name}`);
        return { skipped: true, reason: "unknown-job" };
    }
  }

  private async correlateVideo(data: CorrelationJob): Promise<any> {
    const { doorId, organizationId: orgId, eventType, timestamp } = data;

    if (!orgId) {
      this.logger.warn(`Correlation job missing orgId — skipping`);
      return { skipped: true, reason: "missing-org-id" };
    }
    return withTenantContext(this.prisma, orgId, async () => {
      try {
      // 1. Query CameraDoorMap for cameras mapped to this door (D-14), sorted by priority ASC
      const cameraMaps = await this.prisma.cameraDoorMap.findMany({
        where: { doorId },
        include: {
          camera: {
            select: {
              id: true,
              name: true,
              lastSnapshotUrl: true,
            },
          },
        },
        orderBy: { priority: "asc" },
      });

      if (cameraMaps.length === 0) {
        this.logger.debug(
          `No camera mapped to door ${doorId}, skipping correlation`,
        );
        return { skipped: true, reason: "no-camera-mapping" };
      }

      // 2. Use the top-priority camera
      const camera = cameraMaps[0].camera;
      const snapshotUrl = camera.lastSnapshotUrl;
      if (!snapshotUrl) {
        this.logger.debug(
          `No snapshot available for camera ${camera.id}, skipping correlation`,
        );
        return { skipped: true, reason: "no-snapshot" };
      }

      const eventTime = new Date(timestamp);

      // 3. Store correlation result in access_events metadata
      try {
        await this.prisma.$queryRaw`
          UPDATE access_events
          SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(
            {
              correlation: {
                cameraId: camera.id,
                cameraName: camera.name,
                snapshotUrl,
                thumbnailUrl: snapshotUrl,
                correlatedAt: new Date().toISOString(),
              },
            },
          )}::jsonb
          WHERE door_id = ${doorId}::uuid
            AND time >= ${eventTime}::timestamptz - INTERVAL '1 second'
            AND time <= ${eventTime}::timestamptz + INTERVAL '1 second'
          LIMIT 1
        `;
      } catch (err: any) {
        // access_events hypertable may not exist yet
        this.logger.warn(
          `Failed to update access_events metadata (hypertable may not exist): ${err.message}`,
        );
      }

      // 4. Emit correlation.ready for real-time Socket.IO push (VEC-04)
      this.eventEmitter.emit("correlation.ready", {
        doorId,
        organizationId: orgId,
        eventType,
        cameraId: camera.id,
        cameraName: camera.name,
        snapshotUrl,
        thumbnailUrl: snapshotUrl,
        timestamp,
      });

      this.logger.log(
        `Video correlation complete for door=${doorId}, camera=${camera.name}`,
      );

      return { correlated: true, doorId, cameraId: camera.id };
      } catch (err: any) {
        this.logger.error(
          `Correlation error for door=${doorId}: ${err.message}`,
          err.stack,
        );
        throw err;
      }
    });
  }
}
