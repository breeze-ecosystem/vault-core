import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { LicenseService } from "../license.service";

/**
 * LicenseExpiryGuard checks that the current org's license is not expired
 * (past grace period). It allows mutations during trial, active, and grace states,
 * but blocks them when the license has fully expired.
 *
 * This guard is NOT a global APP_GUARD — applied selectively to mutation endpoints
 * (camera/door create, etc.) via @UseGuards(LicenseExpiryGuard).
 */
@Injectable()
export class LicenseExpiryGuard implements CanActivate {
  constructor(
    private licenseService: LicenseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.orgId;

    // No orgId — let auth guards handle this
    if (!orgId) return true;

    const status = await this.licenseService.getLicenseStatus(orgId);

    if (status.licenseState === "expired") {
      throw new ForbiddenException(
        "Licence expirée — Fonctionnalités en lecture seule. Contactez votre administrateur.",
      );
    }

    return true;
  }
}
