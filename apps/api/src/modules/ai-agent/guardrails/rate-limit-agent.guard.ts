import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import Redis from "ioredis";

/**
 * Per-role rate limits for agent API calls (requests per minute).
 * Per D-32:
 * - OPERATOR: 5 req/min
 * - SUPERVISOR: 15 req/min
 * - ADMIN: 30 req/min
 * - Default (unknown role): 5 req/min
 */
const ROLE_RATE_LIMITS: Record<string, number> = {
  ADMIN: 30,
  SUPERVISOR: 15,
  OPERATOR: 5,
};

const DEFAULT_RATE_LIMIT = 5; // fallback for unknown roles
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_KEY_PREFIX = "agent:ratelimit";

/**
 * RateLimitAgentGuard enforces per-role rate limiting on agent endpoints.
 *
 * Per D-32: Uses Redis atomic INCR + EXPIRE for accurate counting
 * across multiple server instances. Rolling 60-second window.
 *
 * Rate limit key pattern: agent:ratelimit:{userId}:{minute}
 *
 * Follows RolesGuard structure: Reflector + CanActivate + ExecutionContext,
 * but returns HttpException(429) instead of ForbiddenException on rate limit
 * violation, with Retry-After header.
 */
@Injectable()
export class RateLimitAgentGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitAgentGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject("REDIS_AGENT") private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // No authenticated user — allow (auth guard should have caught this)
      return true;
    }

    const userId = user.id ?? user.sub;
    if (!userId) {
      return true;
    }

    const userRole = (user.role as string) ?? "OPERATOR";
    const limit = ROLE_RATE_LIMITS[userRole] ?? DEFAULT_RATE_LIMIT;

    // Per-minute rolling window — key includes the minute bucket
    const minuteBucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
    const key = `${RATE_LIMIT_KEY_PREFIX}:${userId}:${minuteBucket}`;

    try {
      const currentCount = await this.redis.incr(key);

      // Set expiry on first request in the window
      if (currentCount === 1) {
        await this.redis.expire(key, RATE_LIMIT_WINDOW_SECONDS + 1);
      }

      if (currentCount > limit) {
        const ttl = await this.redis.ttl(key);
        const retryAfter = ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS;

        this.logger.warn(
          `Rate limit exceeded for user ${userId} (${userRole}): ${currentCount}/${limit}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Limite de requêtes dépassée. Réessayez dans ${retryAfter} secondes.`,
            error: "Too Many Requests",
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }

      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.error(`Rate limit Redis error: ${message}`);

      // Fail-open: allow request if Redis is unavailable
      return true;
    }
  }
}
