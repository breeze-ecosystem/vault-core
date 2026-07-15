import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Inject } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { FEATURE_KEY } from "../decorators/feature-gate.decorator";
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
    if (!feature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.orgId) {
      throw new ForbiddenException("No organization context");
    }

    // Check Redis cache first
    const cacheKey = `feature:${user.orgId}:${feature}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached === "1") return true;
      if (cached === "0")
        throw new ForbiddenException("Feature not available on your plan");
    } catch (err: any) {
      // If Redis error is not a ForbiddenException from our cache hit,
      // treat it as a cache miss and fall through to DB query
      if (err instanceof ForbiddenException) throw err;
    }

    // Cache miss: query FeatureFlag table
    // The Prisma extension auto-scopes this query to the current org via AsyncLocalStorage
    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        organizationId_key: {
          organizationId: user.orgId,
          key: feature,
        },
      },
    });

    const enabled = flag?.enabled ?? false;

    // Cache result in Redis with 5-minute TTL
    try {
      await this.redis.set(
        cacheKey,
        enabled ? "1" : "0",
        "EX",
        300,
      );
    } catch {
      // Redis unavailable — proceed with DB result
    }

    if (!enabled) {
      throw new ForbiddenException("Feature not available on your plan");
    }

    return true;
  }
}
