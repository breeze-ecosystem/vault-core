import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditProcessor } from "./audit.processor";

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: "audit-write" })],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor, AuditProcessor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
