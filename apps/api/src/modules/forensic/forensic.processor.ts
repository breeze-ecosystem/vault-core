import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { ForensicService } from "./forensic.service";

export interface ForensicJobData {
  eventId: string;
  mediaType: "zip" | "clip";
  orgId: string;
}

@Processor("forensic-certification")
export class ForensicProcessor extends WorkerHost {
  private readonly logger = new Logger(ForensicProcessor.name);

  constructor(private readonly forensicService: ForensicService) {
    super();
  }

  async process(job: Job<ForensicJobData, any, string>): Promise<any> {
    const { eventId, mediaType, orgId } = job.data;
    const jobId = job.id ?? crypto.randomUUID();

    this.logger.log(
      `Forensic certification job ${jobId}: event=${eventId} type=${mediaType}`,
    );

    try {
      const result = await this.forensicService.certifyEvidence(
        eventId,
        mediaType,
        orgId,
      );

      this.logger.log(
        `Forensic certification ${jobId} completed: evidence=${result.evidenceId}`,
      );

      return result;
    } catch (err: any) {
      this.logger.error(
        `Forensic certification ${jobId} failed: ${err.message}`,
      );

      // Re-throw to trigger BullMQ retry (default: 3 retries with exponential backoff)
      throw err;
    }
  }
}
