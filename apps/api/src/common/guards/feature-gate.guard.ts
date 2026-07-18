import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Inject } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";
import {
  FEATURE_KEY,
  PACK_KEY,
  MODULE_KEY,
} from "../decorators/feature-gate.decorator";
import Redis from "ioredis";

@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    @Inject("REDIS") private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<string>(
      FEATURE_KEY,
      context.getHandler(),
    );
    const requiredPack = this.reflector.get<string>(
      PACK_KEY,
      context.getHandler(),
    );
    const requiredModule = this.reflector.get<string>(
      MODULE_KEY,
      context.getHandler(),
    );

    if (!feature && !requiredPack && !requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.orgId) {
      throw new ForbiddenException("No organization context");
    }

    const orgId = user.orgId;

    if (feature) {
      const cacheKey = `feature:${orgId}:${feature}`;
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached === "1") {
          if (!requiredPack && !requiredModule) return true;
        } else if (cached === "0") {
          throw new ForbiddenException("Cette fonctionnalité n'est pas disponible");
        }
      } catch (err: any) {
        if (err instanceof ForbiddenException) throw err;
      }

      const flag = await this.prisma.featureFlag.findUnique({
        where: {
          organizationId_key: {
            organizationId: orgId,
            key: feature,
          },
        },
      });

      const enabled = flag?.enabled ?? false;

      try {
        await this.redis.set(cacheKey, enabled ? "1" : "0", "EX", 300);
      } catch {}

      if (!enabled) {
        throw new ForbiddenException("Cette fonctionnalité n'est pas disponible");
      }
    }

    if (requiredPack) {
      const orgFlag = await this.prisma.featureFlag.findFirst({
        where: { organizationId: orgId, pack: { not: null } },
        select: { pack: true },
      });

      if (!orgFlag?.pack) {
        throw new ForbiddenException("Cette fonctionnalité n'est pas incluse dans votre pack");
      }

      if (requiredPack === "BASTION" && orgFlag.pack !== "BASTION") {
        throw new ForbiddenException("Cette fonctionnalité n'est pas incluse dans votre pack");
      }
    }

    if (requiredModule) {
      const moduleFlag = await this.prisma.featureFlag.findFirst({
        where: {
          organizationId: orgId,
          moduleKey: requiredModule,
        },
      });

      if (!moduleFlag?.enabled) {
        throw new ForbiddenException("Module optionnel non activé");
      }
    }

    return true;
  }
}
