import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { GovernanceService } from "./governance.service";

@Processor("retention-pruning")
export class GovernanceProcessor extends WorkerHost {
  private readonly logger = new Logger(GovernanceProcessor.name);

  constructor(private readonly governanceService: GovernanceService) {
    super();
  }

  async process(job: Job<{
    eventType: string;
    tableType: string;
    retentionDays: number;
  }, any, string>): Promise<any> {
    const { eventType, tableType, retentionDays } = job.data;

    this.logger.log(`Pruning ${eventType} older than ${retentionDays} days`);

    try {
      await this.governanceService.prune(eventType, tableType, retentionDays);
      this.logger.log(`Pruned ${eventType} older than ${retentionDays} days`);
    } catch (err: any) {
      this.logger.error(`Failed to prune ${eventType}: ${err.message}`);
      throw err;
    }
  }
}
