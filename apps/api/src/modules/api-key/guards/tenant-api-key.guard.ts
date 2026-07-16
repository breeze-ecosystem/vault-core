import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  Inject,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import * as crypto from "crypto";

/**
 * TenantApiKeyGuard validates the X-API-Key header against stored
 * TenantApiKey records. Checks SHA-256 hash, expiry, and revocation.
 * Implements Redis-based per-key rate limiting with X-RateLimit-* headers.
 *
 * On success attaches request.apiKeyInfo = { id, name, scopes, rateLimit, organizationId }
 * for downstream TenantIsolationGuard and controllers.
 */
@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(TenantApiKeyGuard.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Inject("REDIS") private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiKey: string | undefined = request.headers["x-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("Clé API requise (en-tête X-API-Key)");
    }

    // SHA-256 hash the raw key
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const keyRecord = await this.prisma.tenantApiKey.findFirst({
      where: { keyHash, isActive: true },
    });

    if (!keyRecord) {
      throw new UnauthorizedException("Clé API invalide");
    }

    // Check expiry
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException("La clé API a expiré");
    }

    // Check revocation
    if (keyRecord.revokedAt) {
      throw new UnauthorizedException("La clé API a été révoquée");
    }

    // Per-key rate limiting via Redis INCR
    try {
      const windowKey = `apikey:ratelimit:${keyRecord.id}:${Math.floor(Date.now() / 60000)}`;
      const current = await this.redis.incr(windowKey);
      if (current === 1) {
        await this.redis.expire(windowKey, 60);
      }

      const remaining = Math.max(0, keyRecord.rateLimit - current);

      // Set X-RateLimit-* headers on the response
      if (response && typeof response.header === "function") {
        response.header("X-RateLimit-Limit", keyRecord.rateLimit);
        response.header("X-RateLimit-Remaining", remaining);
        response.header(
          "X-RateLimit-Reset",
          Math.ceil((Math.floor(Date.now() / 60000) + 1) * 60 / 1000),
        );
      }

      if (current > keyRecord.rateLimit) {
        throw new HttpException("Limite de débit dépassée", 429);
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      // Redis unavailable — fail open (allow request through)
      this.logger.warn(`Rate limit Redis unavailable: ${err.message}`);
      if (response && typeof response.header === "function") {
        response.header("X-RateLimit-Limit", keyRecord.rateLimit);
      }
    }

    // Update lastUsedAt asynchronously (non-blocking)
    this.prisma.tenantApiKey
      .update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) =>
        this.logger.warn(`Failed to update lastUsedAt: ${err.message}`),
      );

    // Attach API key info for downstream guards/controllers
    request.apiKeyInfo = {
      id: keyRecord.id,
      name: keyRecord.name,
      scopes: keyRecord.scopes as string[],
      rateLimit: keyRecord.rateLimit,
      organizationId: keyRecord.organizationId,
    };

    return true;
  }
}
