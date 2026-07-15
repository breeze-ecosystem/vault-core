import { Logger, Inject } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { AlertService } from "../alert/alert.service";
import type { TailgatingJob } from "@repo/shared";
import { withTenantContext } from "../../common/helpers/tenant-worker";

/**
 * TailgatingProcessor — AI-04, D-20, D-21.
 * Triggered 3 seconds after a valid access event.
 * Sends the camera snapshot to Ollama vision model to count persons.
 * If >1 person detected, creates a HIGH severity tailgating alert.
 */
@Processor("tailgating-detection")
export class TailgatingProcessor extends WorkerHost {
  private readonly logger = new Logger(TailgatingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private alertService: AlertService,
    private configService: ConfigService,
    @Inject("REDIS") private redis: Redis,
  ) {
    super();
  }

  async process(job: Job<TailgatingJob, any, string>): Promise<any> {
    switch (job.name) {
      case "detect-tailgating":
        return this.detect(job.data);
      default:
        this.logger.warn(`Unknown tailgating job: ${job.name}`);
        return { skipped: true, reason: "unknown-job" };
    }
  }

  private async detect(data: TailgatingJob): Promise<any> {
    const { doorId, orgId, eventTimestamp } = data;

    if (!orgId) {
      this.logger.warn(`Tailgating job missing orgId — skipping`);
      return { skipped: true, reason: "missing-org-id" };
    }
    return withTenantContext(this.prisma, orgId, async () => {
      try {
      // 1. Get cameras mapped to the door (D-14: CameraDoorMap)
      const cameraMaps = await this.prisma.cameraDoorMap.findMany({
        where: { doorId },
        include: {
          camera: {
            select: { id: true, name: true, lastSnapshotUrl: true },
          },
        },
        orderBy: { priority: "asc" },
      });

      if (cameraMaps.length === 0) {
        this.logger.debug(
          `No camera mapped to door ${doorId}, skipping tailgating detection`,
        );
        return { skipped: true, reason: "no-camera-mapping" };
      }

      // 2. Use the primary camera's latest snapshot
      const camera = cameraMaps[0].camera;
      const snapshotUrl = camera.lastSnapshotUrl;
      if (!snapshotUrl) {
        this.logger.debug(
          `No snapshot available for camera ${camera.id}, skipping tailgating`,
        );
        return { skipped: true, reason: "no-snapshot" };
      }

      // 3. Send to Ollama vision model for person counting (D-20, D-21)
      const ollamaUrl = this.configService.get(
        "OLLAMA_BASE_URL",
        "http://localhost:11434",
      );
      const model = this.configService.get("OLLAMA_MODEL", "moondream");

      let count = 1;
      try {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prompt:
              'Count the number of people visible in this doorway image. Return ONLY a JSON object with a single key "count" and an integer value. Example: {"count": 1}',
            images: [snapshotUrl],
            stream: false,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          this.logger.warn(
            `Ollama returned ${response.status} for tailgating detection on door ${doorId}`,
          );
          return { skipped: true, reason: "ollama-error" };
        }

        const result = await response.json();
        try {
          const parsed = JSON.parse(result.response);
          count = typeof parsed.count === "number" ? parsed.count : 1;
        } catch {
          // Fallback: regex extraction for number from text response
          const match = (result.response || "").match(/\d+/);
          count = match ? parseInt(match[0], 10) : 1;
        }

        this.logger.log(
          `Tailgating detection: door=${doorId}, persons=${count}`,
        );
      } catch (fetchErr: any) {
        this.logger.warn(
          `Ollama fetch failed for tailgating on door ${doorId}: ${fetchErr.message}`,
        );
        return { skipped: true, reason: "ollama-unreachable" };
      }

      // 4. D-21: If >1 person detected, generate tailgating alert
      if (count > 1) {
        // Deduplication: check Redis for tailgating cooldown per door (120s)
        const cooldownKey = `tailgating:cooldown:${doorId}`;
        const isOnCooldown = await this.redis.get(cooldownKey);
        if (isOnCooldown) {
          this.logger.debug(
            `Tailgating cooldown active for door ${doorId}, skipping alert`,
          );
          return { skipped: true, reason: "cooldown" };
        }

        // Look up door name for alert title
        const door = await this.prisma.door.findUnique({
          where: { id: doorId },
          select: { name: true },
        });

        await this.alertService.create({
          title: `Détection de tailgating — ${door?.name ?? `Porte ${doorId}`}`,
          description: `${count} personnes détectées lors d'un seul accès valide.`,
          severity: "HIGH",
          cameraId: camera.id,
          snapshotUrl: camera.lastSnapshotUrl,
          metadata: {
            doorId,
            orgId,
            personCount: count,
            eventTimestamp,
            detectedAt: new Date().toISOString(),
            type: "tailgating",
          },
        } as any);

        // Set 120s cooldown
        await this.redis.setex(cooldownKey, 120, "1");

        this.logger.warn(
          `Tailgating alert created: door=${doorId}, persons=${count}`,
        );
        return { alerted: true, doorId, personCount: count };
      }

      return { detected: false, doorId, personCount: count };
      } catch (err: any) {
        this.logger.error(
          `Tailgating detection error for door=${doorId}: ${err.message}`,
          err.stack,
        );
        throw err;
      }
    });
  }
}
