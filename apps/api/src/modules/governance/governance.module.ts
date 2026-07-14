import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { GovernanceController } from "./governance.controller";
import { GovernanceService } from "./governance.service";
import { GovernanceProcessor } from "./governance.processor";

@Module({
  imports: [
    BullModule.registerQueue({ name: "retention-pruning" }),
  ],
  controllers: [GovernanceController],
  providers: [GovernanceService, GovernanceProcessor],
  exports: [GovernanceService],
})
export class GovernanceModule {}
