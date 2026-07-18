import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { LicenseController } from "./license.controller";
import { LicenseService } from "./license.service";
import { LicenseKeyManager } from "./license-key-manager";
import { LicenseExpiryGuard } from "./guards/license-expiry.guard";
import { LicenseVerificationService } from "./license-verification.service";

@Module({
  imports: [HttpModule],
  controllers: [LicenseController],
  providers: [
    LicenseService,
    LicenseKeyManager,
    LicenseExpiryGuard,
    LicenseVerificationService,
  ],
  exports: [
    LicenseService,
    LicenseExpiryGuard,
  ],
})
export class LicenseModule {}
