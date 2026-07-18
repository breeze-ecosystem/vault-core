import { Module } from "@nestjs/common";
import { LicenseController } from "./license.controller";
import { LicenseService } from "./license.service";
import { LicenseKeyManager } from "./license-key-manager";
import { LicenseExpiryGuard } from "./guards/license-expiry.guard";

@Module({
  controllers: [LicenseController],
  providers: [
    LicenseService,
    LicenseKeyManager,
    LicenseExpiryGuard,
  ],
  exports: [
    LicenseService,
  ],
})
export class LicenseModule {}
