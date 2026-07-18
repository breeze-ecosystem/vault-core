import { Module } from "@nestjs/common";
import { PseudonymizationService } from "./pseudonymization.service";
import { PseudonymizationInterceptor } from "./pseudonymization.interceptor";

@Module({
  providers: [PseudonymizationService, PseudonymizationInterceptor],
  exports: [PseudonymizationService, PseudonymizationInterceptor],
})
export class PseudonymizationModule {}
