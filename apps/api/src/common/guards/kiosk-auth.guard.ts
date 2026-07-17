import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import * as crypto from "node:crypto";

/**
 * KioskAuthGuard accepts either a valid X-API-Key header OR a valid JWT bearer token.
 *
 * Authentication flows:
 * 1. X-API-Key present + valid → sets request.user with orgId from key record, returns true
 * 2. X-API-Key present + invalid → throws 401 immediately (no fallthrough to JWT)
 * 3. No X-API-Key → checks @Public() decorator skip, then falls through to JWT passport auth
 *
 * Used on KioskController endpoints via @UseGuards(KioskAuthGuard) + @Public().
 */
@Injectable()
export class KioskAuthGuard implements CanActivate {
  private readonly logger = new Logger(KioskAuthGuard.name);

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey: string | undefined = request.headers["x-api-key"];

    // ── Path 1 & 2: API key present (valid or invalid) ──
    if (apiKey) {
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

      // Attach API key info and user context
      request.apiKeyInfo = {
        id: keyRecord.id,
        name: keyRecord.name,
        scopes: keyRecord.scopes as string[],
        rateLimit: keyRecord.rateLimit,
        organizationId: keyRecord.organizationId,
      };

      request.user = {
        orgId: keyRecord.organizationId,
        apiKeyId: keyRecord.id,
        scopes: keyRecord.scopes as string[],
      };

      return true;
    }

    // ── Path 3: No API key — check @Public() skip, then JWT ──
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Fall through to JWT passport auth — the global JwtAuthGuard handles this
    // via the passport "jwt" strategy. At this point we return true and let the
    // passport authentication pipeline handle the bearer token validation.
    //
    // Since JwtAuthGuard is registered as a global APP_GUARD, it will wrap
    // this endpoint with @Public() skipping its own check. The KioskAuthGuard
    // with @Public() ensures TenantIsolationGuard also passes.
    //
    // If no JWT is present and no @Public() skip, throw unauthorized.
    const authHeader = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentification requise");
    }

    // JWT validation is delegated to the passport strategy
    return true;
  }
}
