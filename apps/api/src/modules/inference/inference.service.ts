import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FrameJob } from "../queue/queue.service";

export interface InferenceResult {
  detections: {
    promptId: string;
    promptText: string;
    detected: boolean;
    confidence: number;
    description: string;
  }[];
}

@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name);
  private readonly aiBaseUrl: string;

  constructor(private config: ConfigService) {
    this.aiBaseUrl = this.config.get("AI_PREPROCESSOR_URL", "http://localhost:8000");
  }

  async analyzeFrame(job: FrameJob): Promise<InferenceResult> {
    try {
      const response = await fetch(`${this.aiBaseUrl}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: job.snapshotBuffer,
          prompts: job.prompts,
          camera_id: job.cameraId,
          timestamp: job.timestamp,
        }),
        signal: AbortSignal.timeout(300000),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`AI preprocessor error: ${response.status} ${text}`);
        return { detections: [] };
      }

      return await response.json() as InferenceResult;
    } catch (err: any) {
      this.logger.error(`Inference call failed: ${err.message}`);
      return { detections: [] };
    }
  }
}
