import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import Redis from "ioredis";

/**
 * Per-key rate limiting utility used by TenantApiKeyGuard.
 *
 * The rate limit logic is integrated directly into TenantApiKeyGuard
 * for simplicity — this file exists as a dedicated module in case
 * the rate-limiting logic needs to be reused or tested independently.
 *
 * Pattern: Redis INCR with 60-second window, expire-on-first-increment.
 * Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */
@Injectable()
export class ApiKeyRateLimitService {
  private readonly logger = new Logger(ApiKeyRateLimitService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Inject("REDIS") private redis: Redis,
  ) {}

  /**
   * Check rate limit for a given key ID.
   * Returns { allowed, remaining, resetTimestamp }.
   * If Redis is unavailable, fails open (allows request).
   */
  async checkRateLimit(
    keyId: string,
    rateLimit: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTimestamp: number }> {
    try {
      const windowKey = `apikey:ratelimit:${keyId}:${Math.floor(Date.now() / 60000)}`;
      const current = await this.redis.incr(windowKey);
      if (current === 1) {
        await this.redis.expire(windowKey, 60);
      }

      const remaining = Math.max(0, rateLimit - current);
      const resetTimestamp = Math.ceil(
        (Math.floor(Date.now() / 60000) + 1) * 60,
      );

      return {
        allowed: current <= rateLimit,
        remaining,
        resetTimestamp,
      };
    } catch (err: any) {
      this.logger.warn(`Rate limit check failed (fail-open): ${err.message}`);
      return { allowed: true, remaining: rateLimit, resetTimestamp: 0 };
    }
  }
}
