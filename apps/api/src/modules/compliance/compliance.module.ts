import { Module, OnModuleInit } from "@nestjs/common";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import { WebhookModule } from "../webhook/webhook.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [WebhookModule, AuditModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule implements OnModuleInit {
  constructor(private readonly complianceService: ComplianceService) {}

  onModuleInit() {
    // Register EventEmitter listeners for auto-populating ProcessingRecord (BAS-31)
    this.complianceService.registerProcessingListeners();
  }
}
