import { Logger, Inject } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { AlertService } from "../alert/alert.service";
import { type DoorAlertJob, DOOR_STATES } from "@repo/shared";

@Processor("door-alerts")
export class DoorProcessor extends WorkerHost {
  private readonly logger = new Logger(DoorProcessor.name);

  constructor(
    private prisma: PrismaService,
    private alertService: AlertService,
    @Inject("REDIS") private redis: Redis,
  ) {
    super();
  }

  async process(job: Job<DoorAlertJob, any, string>): Promise<any> {
    switch (job.name) {
      case "evaluate-door-alert":
        return this.evaluateDoorAlert(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * D-14: Query CameraDoorMap for door's cameras (priority-sorted).
   * Create alert via existing AlertService with 60s cooldown deduplication.
   */
  private async evaluateDoorAlert(data: DoorAlertJob) {
    const { doorId, siteId, state, reason, timestamp } = data;

    // 60s cooldown: prevent duplicate alerts for same door+state
    const cooldownKey = `door:alert:cooldown:${doorId}:${state}`;
    const isOnCooldown = await this.redis.get(cooldownKey);
    if (isOnCooldown) {
      this.logger.debug(
        `Alert cooldown active for door ${doorId} (${state}), skipping`,
      );
      return { skipped: true, reason: "cooldown" };
    }

    // Set 60s cooldown
    await this.redis.setex(cooldownKey, 60, "1");

    try {
      // Query CameraDoorMap for door's cameras, priority-sorted (D-14)
      const cameraMaps = await this.prisma.cameraDoorMap.findMany({
        where: { doorId },
        orderBy: { priority: "desc" },
        include: {
          camera: {
            select: {
              id: true,
              name: true,
              lastSnapshotUrl: true,
            },
          },
        },
      });

      const cameraId = cameraMaps[0]?.camera?.id ?? null;
      const snapshotUrl = cameraMaps[0]?.camera?.lastSnapshotUrl ?? null;

      // Determine severity based on state
      const severity =
        state === DOOR_STATES.FORCED || state === DOOR_STATES.DESYNCHRONIZED
          ? "HIGH"
          : "MEDIUM";

      // Build alert title from reason
      const door = await this.prisma.door.findUnique({
        where: { id: doorId },
        select: { name: true },
      });
      const title = door
        ? `${door.name}: ${reason}`
        : `Door ${doorId}: ${reason}`;

      await this.alertService.create({
        title,
        description: `Door alert: ${state} at ${new Date(timestamp).toISOString()}`,
        severity: severity as any,
        cameraId: cameraId ?? undefined,
        snapshotUrl: snapshotUrl ?? undefined,
        metadata: {
          doorId,
          state,
          eventTimestamp: timestamp,
          siteId,
        } as any,
      } as any);

      this.logger.log(
        `Alert created: door=${doorId}, state=${state}, reason=${reason}`,
      );

      return { created: true, doorId, state };
    } catch (err: any) {
      this.logger.error(
        `Failed to create door alert for ${doorId}: ${err.message}`,
      );
      throw err;
    }
  }
}
