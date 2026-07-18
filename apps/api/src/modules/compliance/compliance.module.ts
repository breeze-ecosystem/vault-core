import { Module, OnModuleInit } from "@nestjs/common";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import { SubjectAccessService } from "./subject-access.service";
import { SubjectAccessController } from "./subject-access.controller";
import { WebhookModule } from "../webhook/webhook.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [WebhookModule, AuditModule],
  controllers: [ComplianceController, SubjectAccessController],
  providers: [ComplianceService, SubjectAccessService],
  exports: [ComplianceService, SubjectAccessService],
})
export class ComplianceModule implements OnModuleInit {
  constructor(private readonly complianceService: ComplianceService) {}

  onModuleInit() {
    // Register EventEmitter listeners for auto-populating ProcessingRecord (BAS-31)
    this.complianceService.registerProcessingListeners();
  }
}
