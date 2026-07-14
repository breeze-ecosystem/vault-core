import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PatternsService } from "./patterns.service";

@Processor("recurring-patterns")
export class PatternsProcessor extends WorkerHost {
  private readonly logger = new Logger(PatternsProcessor.name);

  constructor(private patternsService: PatternsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "detect-patterns":
        await this.patternsService.detectPatterns();
        return { completed: true };
      case "resolve-pattern":
        // Job data: { patternId: string, deviceId: string }
        await this.patternsService.resolvePattern(
          job.data.patternId,
          job.data.deviceId,
        );
        return { resolved: true };
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { skipped: true, reason: `Unknown job name: ${job.name}` };
    }
  }
}
