import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export interface FrameJob {
  cameraId: string;
  orgId: string;
  snapshotBuffer: string;
  timestamp: string;
  prompts: { id: string; text: string; severity: string }[];
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue("frame-processing") private frameQueue: Queue,
    @InjectQueue("notification") private notifQueue: Queue,
  ) {}

  async enqueueFrame(job: FrameJob) {
    return this.frameQueue.add("analyze-frame", job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  async enqueueNotification(data: {
    alertId: string;
    type: "websocket" | "push" | "webhook";
    payload: Record<string, unknown>;
  }) {
    return this.notifQueue.add("notify", data, {
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: 20,
    });
  }

  async getFrameQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.frameQueue.getWaitingCount(),
      this.frameQueue.getActiveCount(),
      this.frameQueue.getCompletedCount(),
      this.frameQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }
}
