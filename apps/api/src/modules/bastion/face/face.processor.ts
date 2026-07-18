import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { withTenantContext } from "../../../common/helpers/tenant-worker";
import type { Prisma } from "@prisma/client";

export interface FacePassageJob {
  faceId: string;
  cameraId: string;
  organizationId: string;
  riskScore: number;
  snapshotUrl?: string;
  metadata?: Record<string, unknown>;
  detectedAt: string;
}

export interface BlacklistAlertJob {
  faceId: string;
  faceName: string;
  organizationId: string;
  cameraId: string;
  riskScore: number;
  snapshotUrl?: string;
  detectedAt: string;
}

@Processor("bastion-events")
export class FaceProcessor extends WorkerHost {
  private readonly logger = new Logger(FaceProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "face-passage":
        return this.persistFacePassage(job.data);
      case "blacklist-alert":
        return this.dispatchBlacklistAlert(job.data);
      case "face-enrollment-complete":
        return this.handleEnrollmentComplete(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Persist a face detection/passage event to the FacePassage table.
   */
  private async persistFacePassage(data: FacePassageJob) {
    const { organizationId } = data;
    if (!organizationId) {
      this.logger.warn("Face passage job missing organizationId — skipping");
      return { skipped: true, reason: "missing-org-id" };
    }

    return withTenantContext(this.prisma, organizationId, async () => {
      try {
        await this.prisma.facePassage.create({
          data: {
            faceId: data.faceId,
            cameraId: data.cameraId,
            organizationId: data.organizationId,
            riskScore: data.riskScore,
            snapshotUrl: data.snapshotUrl ?? null,
            metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
            detectedAt: new Date(data.detectedAt),
          },
        });
        this.logger.log(`Face passage persisted: face=${data.faceId}, riskScore=${data.riskScore}`);
      } catch (err: any) {
        this.logger.error(`Failed to persist face passage: ${err.message}`);
        throw err;
      }
    });
  }

  /**
   * Dispatch a CRITICAL alert when a blacklisted face is detected.
   * Emits event for Socket.IO push to ALL operators.
   */
  private async dispatchBlacklistAlert(data: BlacklistAlertJob) {
    const { organizationId } = data;
    if (!organizationId) {
      this.logger.warn("Blacklist alert job missing organizationId — skipping");
      return { skipped: true, reason: "missing-org-id" };
    }

    this.logger.warn(`BLACKLIST ALERT: ${data.faceName} detected at camera ${data.cameraId}`);

    // Emit event for Socket.IO broadcast and notification pipeline
    const { EventEmitter2 } = await import("@nestjs/event-emitter");
    const emitter = new EventEmitter2();

    emitter.emit("bastion.blacklist-alert", {
      faceId: data.faceId,
      faceName: data.faceName,
      organizationId: data.organizationId,
      cameraId: data.cameraId,
      riskScore: data.riskScore,
      snapshotUrl: data.snapshotUrl,
      detectedAt: data.detectedAt,
      severity: "CRITICAL",
      timestamp: new Date().toISOString(),
    });

    return { dispatched: true, faceName: data.faceName };
  }

  /**
   * Post-processing after face enrollment is complete (e.g., notify webhook subscribers).
   */
  private async handleEnrollmentComplete(data: any) {
    this.logger.log(`Face enrollment complete: ${data.faceId} (${data.faceName})`);
    return { processed: true };
  }
}
