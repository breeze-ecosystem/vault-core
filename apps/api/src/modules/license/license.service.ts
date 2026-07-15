import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { LicenseKeyManager } from "./license-key-manager";
import type { LicenseClaims } from "@repo/shared";
import type { LicenseStatusResponse, UsageInfo, ApiKeyResult } from "./license.types";
import { TRIAL_DURATION_DAYS } from "@repo/shared";
import { v4 as uuidv4 } from "uuid";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    private prisma: PrismaService,
    private keyManager: LicenseKeyManager,
    private config: ConfigService,
  ) {}

  /**
   * Generate a new signed license JWT and store it in the database with PENDING status.
   */
  async generateLicense(dto: {
    organizationId: string;
    maxCameras: number;
    maxDoors: number;
    expiresAt: string;
    gracePeriodDays?: number;
    licenseVersion?: number;
  }) {
    const privateKey = this.keyManager.getPrivateKey();

    const claims: LicenseClaims = {
      organizationId: dto.organizationId,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(new Date(dto.expiresAt).getTime() / 1000),
      maxCameras: dto.maxCameras,
      maxDoors: dto.maxDoors,
      gracePeriodDays: dto.gracePeriodDays ?? 7,
      licenseVersion: dto.licenseVersion ?? 1,
    };

    const licenseJwt = jwt.sign(claims, privateKey, {
      algorithm: "RS256",
      issuer: "oversight-hub",
    });

    // Store in DB as PENDING (not yet activated)
    await this.prisma.license.create({
      data: {
        organizationId: dto.organizationId,
        licenseJwt,
        status: "PENDING",
        expiresAt: new Date(dto.expiresAt),
        maxCameras: dto.maxCameras,
        maxDoors: dto.maxDoors,
        gracePeriodDays: dto.gracePeriodDays ?? 7,
        licenseVersion: dto.licenseVersion ?? 1,
      },
    });

    return { licenseJwt, claims };
  }

  /**
   * Verify a license JWT signature, check org binding and expiration, then activate.
   */
  async verifyAndActivate(jwtToken: string, orgId: string) {
    const publicKey = this.keyManager.getPublicKey();

    let claims: LicenseClaims;
    try {
      const decoded = jwt.verify(jwtToken, publicKey, {
        algorithms: ["RS256"],
      }) as LicenseClaims;
      claims = decoded;
    } catch (err: any) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new BadRequestException("Cette licence a expiré");
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new BadRequestException("Signature de licence invalide");
      }
      throw new BadRequestException("Échec de la vérification de la licence");
    }

    // Verify bound to this org
    if (claims.organizationId !== orgId) {
      throw new BadRequestException("Cette licence ne s'applique pas à votre organisation");
    }

    // Check not expired
    const now = Math.floor(Date.now() / 1000);
    if (claims.expiresAt < now) {
      throw new BadRequestException("Cette licence a expiré");
    }

    // Activate all PENDING license records for this org that match the JWT
    // (typically there's one, but handle batch gracefully)
    await this.prisma.license.updateMany({
      where: { organizationId: orgId, status: "PENDING" },
      data: { status: "ACTIVE", activatedAt: new Date() },
    });

    return { status: "active" as const, claims };
  }

  /**
   * Get the current license status for an org.
   *
   * Priority order (per RESEARCH Pitfall 5):
   * 1. active > 2. grace > 3. trial > 4. auto-init-trial > 5. expired > 6. no_license
   */
  async getLicenseStatus(orgId: string): Promise<LicenseStatusResponse> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException("Organisation non trouvée");
    }

    // Step 1: Find the most recent active license
    const activeLicense = await this.prisma.license.findFirst({
      where: { organizationId: orgId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    // If we have an active license, check its expiry
    if (activeLicense) {
      const now = new Date();

      // Step 2: License is still within validity period → ACTIVE
      if (activeLicense.expiresAt > now) {
        return {
          licenseState: "active",
          expiresAt: activeLicense.expiresAt,
          maxCameras: activeLicense.maxCameras,
          maxDoors: activeLicense.maxDoors,
        };
      }

      // Step 3: License is expired — check grace period
      const graceEnd = new Date(
        activeLicense.expiresAt.getTime() +
          activeLicense.gracePeriodDays * 86_400_000,
      );

      if (graceEnd > now) {
        // Auto-upgrade status if currently marked as ACTIVE
        if (activeLicense.status === "ACTIVE") {
          await this.prisma.license.update({
            where: { id: activeLicense.id },
            data: { status: "GRACE" },
          });
        }

        return {
          licenseState: "grace",
          expiresAt: activeLicense.expiresAt,
          graceEndsAt: graceEnd,
          maxCameras: activeLicense.maxCameras,
          maxDoors: activeLicense.maxDoors,
        };
      }

      // Step 6: Past grace period → EXPIRED
      if (activeLicense.status !== "EXPIRED") {
        await this.prisma.license.update({
          where: { id: activeLicense.id },
          data: { status: "EXPIRED" },
        });
      }

      return { licenseState: "expired" };
    }

    // Step 4: Check existing trial
    if (org.trialStartDate && org.trialEndDate && org.trialEndDate > new Date()) {
      return {
        licenseState: "trial",
        trialEndsAt: org.trialEndDate,
        isUnlimited: true,
      };
    }

    // Step 5: No trial dates set and no active license → auto-initialize trial
    if (!org.trialStartDate || !org.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000);

      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          trialStartDate: now,
          trialEndDate: trialEnd,
        },
      });

      return {
        licenseState: "trial",
        trialEndsAt: trialEnd,
        isUnlimited: true,
      };
    }

    // Step 7: Trial expired, no active license → no_license
    return { licenseState: "no_license" };
  }

  /**
   * Get current usage counts vs license limits for an org.
   */
  async getUsage(orgId: string): Promise<UsageInfo> {
    const status = await this.getLicenseStatus(orgId);

    const [cameraCount, doorCount] = await Promise.all([
      this.prisma.camera.count({ where: { organizationId: orgId } }),
      this.prisma.door.count({ where: { organizationId: orgId } }),
    ]);

    const maxCameras = status.isUnlimited ? null : (status.maxCameras ?? null);
    const maxDoors = status.isUnlimited ? null : (status.maxDoors ?? null);

    return {
      cameras: { current: cameraCount, max: maxCameras },
      doors: { current: doorCount, max: maxDoors },
    };
  }

  /**
   * List licenses, optionally filtered by org.
   */
  async listLicenses(orgId?: string) {
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;

    return this.prisma.license.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * List all API keys — returns display info only (never the hash).
   */
  async listAllApiKeys() {
    const keys = await this.prisma.licenseApiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        revokedAt: true,
        createdBy: { select: { id: true, email: true } },
      },
    });

    return keys;
  }

  /**
   * Create a new API key.
   * Returns the rawKey (shown once) and the stored hash.
   */
  async createApiKey(name: string, createdById: string): Promise<ApiKeyResult> {
    const rawKey = uuidv4();
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(-4);

    const record = await this.prisma.licenseApiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        createdById,
      },
    });

    return { rawKey, keyPrefix, id: record.id };
  }

  /**
   * Revoke an API key by setting isActive=false.
   */
  async revokeApiKey(id: string) {
    await this.prisma.licenseApiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });

    return { success: true };
  }
}
