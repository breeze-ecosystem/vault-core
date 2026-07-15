import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { AnprService } from "./anpr.service";

interface AnprFrameJob {
  frame: string;
  cameraId: string;
  orgId: string;
  imageUrl?: string;
}

@Processor("anpr-processing")
export class AnprProcessor extends WorkerHost {
  private readonly logger = new Logger(AnprProcessor.name);

  constructor(private anprService: AnprService) {
    super();
  }

  async process(job: { data: AnprFrameJob; name: string }) {
    const { data } = job;
    this.logger.debug(`Processing ANPR frame for camera ${data.cameraId}`);

    try {
      await this.anprService.processFrame(data.frame, data.cameraId, data.orgId, data.imageUrl);
      this.logger.log(`ANPR processing complete for camera ${data.cameraId}`);
    } catch (err: any) {
      this.logger.error(`ANPR processing failed for camera ${data.cameraId}: ${err.message}`);
      // Let BullMQ handle retries based on job options
      throw err;
    }
  }
}
