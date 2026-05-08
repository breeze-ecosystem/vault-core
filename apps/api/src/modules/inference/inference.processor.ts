import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { InferenceService } from "./inference.service";
import { NotificationsService } from "../notifications/notifications.service";
import { FrameJob } from "../queue/queue.service";

@Processor("frame-processing")
export class InferenceProcessor extends WorkerHost {
  private readonly logger = new Logger(InferenceProcessor.name);
  private recentAlerts: Map<string, number> = new Map();
  private readonly DEDUP_WINDOW = 5 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private inference: InferenceService,
    @InjectQueue("notification") private notifQueue: Queue,
    private notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: { data: FrameJob; name: string }) {
    const { data } = job;
    this.logger.debug(`Processing frame for camera ${data.cameraId}`);

    if (data.prompts.length === 0) return;

    const result = await this.inference.analyzeFrame(data);

    this.logger.log(`Inference result for ${data.cameraId}: ${result.detections.length} detections`);
    for (const det of result.detections) {
      this.logger.log(`  - "${det.promptText}": detected=${det.detected}, confidence=${det.confidence}, desc="${det.description.substring(0, 100)}"`);
    }

    for (const det of result.detections) {
      if (!det.detected || det.confidence < 0.45) continue;

      const dedupKey = `${data.cameraId}:${det.promptId}`;
      const lastAlert = this.recentAlerts.get(dedupKey);
      if (lastAlert && Date.now() - lastAlert < this.DEDUP_WINDOW) {
        this.logger.debug(`Dedup: skipping alert for ${dedupKey}`);
        continue;
      }

      const alert = await this.prisma.alert.create({
        data: {
          title: det.description || `Detection: ${det.promptText}`,
          description: `Camera ${data.cameraId} - ${det.promptText} (confidence: ${(det.confidence * 100).toFixed(0)}%)`,
          severity: this.mapSeverity(det.promptText),
          cameraId: data.cameraId,
          metadata: {
            promptId: det.promptId,
            confidence: det.confidence,
            inferenceTimestamp: data.timestamp,
          },
        },
      });

      this.recentAlerts.set(dedupKey, Date.now());

      const camera = await this.prisma.camera.findUnique({
        where: { id: data.cameraId },
      });

      // Legacy websocket broadcast (kept for backward compatibility with existing WS gateway)
      await this.notifQueue.add("notify", {
        alertId: alert.id,
        type: "websocket",
        payload: {
          id: alert.id,
          title: alert.title,
          severity: alert.severity,
          cameraId: data.cameraId,
          cameraName: camera?.name ?? "Unknown",
          createdAt: alert.createdAt,
        },
      });

      // New notification dispatch: resolve camera → site → users and enqueue jobs
      try {
        const notificationJobs = await this.notificationsService.dispatchAlertNotifications(alert.id);
        if (notificationJobs && notificationJobs.length > 0) {
          for (const notifJob of notificationJobs) {
            await this.notifQueue.add("notify", notifJob, {
              attempts: 2,
              removeOnComplete: true,
              removeOnFail: 20,
            });
          }
          this.logger.log(`Dispatched ${notificationJobs.length} notification jobs for alert ${alert.id}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch notifications for alert ${alert.id}: ${err.message}`);
      }

      this.logger.log(`Alert created: ${alert.id} - ${alert.title}`);
    }
  }

  private mapSeverity(promptText: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" {
    const lower = promptText.toLowerCase();
    if (lower.includes("urgent") || lower.includes("danger") || lower.includes("critique")) return "CRITICAL";
    if (lower.includes("important") || lower.includes("attention")) return "HIGH";
    return "MEDIUM";
  }
}
