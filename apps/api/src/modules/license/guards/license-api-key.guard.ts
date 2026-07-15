import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from "crypto";

/**
 * LicenseApiKeyGuard validates the X-API-Key header against stored
 * API key hashes. Used on POST /api/licenses/generate for programmatic
 * license creation (D-04: dedicated API key auth, not user JWT).
 *
 * The raw API key is SHA-256 hashed and compared against the stored hash.
 * Only non-revoked (isActive=true) keys are accepted.
 */
@Injectable()
export class LicenseApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey: string | undefined = request.headers["x-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("Clé API requise (en-tête X-API-Key)");
    }

    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const keyRecord = await this.prisma.licenseApiKey.findFirst({
      where: { keyHash, isActive: true },
    });

    if (!keyRecord) {
      throw new UnauthorizedException("Clé API invalide");
    }

    request.apiKeyInfo = { id: keyRecord.id, name: keyRecord.name };
    return true;
  }
}
