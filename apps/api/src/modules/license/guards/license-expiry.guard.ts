import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { LicenseService } from "../license.service";
import { DEGRADED_BLOCK_KEY } from "../../../common/decorators/degraded-block.decorator";

@Injectable()
export class LicenseExpiryGuard implements CanActivate {
  constructor(
    private licenseService: LicenseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.orgId;

    if (!orgId) return true;

    const status = await this.licenseService.getLicenseStatus(orgId);

    if (status.licenseState === "expired") {
      throw new ForbiddenException(
        "Licence expirée — Fonctionnalités en lecture seule. Contactez votre administrateur.",
      );
    }

    if (status.licenseState === "degraded") {
      const isBlocked = this.reflector.get<boolean>(
        DEGRADED_BLOCK_KEY,
        context.getHandler(),
      );
      if (isBlocked) {
        throw new ForbiddenException(
          "Mode dégradé — Activation internet requise pour modifier la configuration. La vidéo et l'enregistrement continuent de fonctionner.",
        );
      }
    }

    return true;
  }
}
