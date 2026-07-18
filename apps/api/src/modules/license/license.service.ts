import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LicenseKeyManager } from "./license-key-manager";
import type { LicenseClaims } from "@repo/shared";
import type { LicenseStatusResponse, UsageInfo } from "./license.types";
import { TRIAL_DURATION_DAYS } from "@repo/shared";
import * as jwt from "jsonwebtoken";

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    private prisma: PrismaService,
    private keyManager: LicenseKeyManager,
  ) {}

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

    if (claims.organizationId !== orgId) {
      throw new BadRequestException("Cette licence ne s'applique pas à votre organisation");
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.expiresAt < now) {
      throw new BadRequestException("Cette licence a expiré");
    }

    await this.prisma.license.updateMany({
      where: { organizationId: orgId, status: "PENDING" },
      data: {
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });

    return { status: "active" as const, claims };
  }

  async getLicenseStatus(orgId: string): Promise<LicenseStatusResponse> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException("Organisation non trouvée");
    }

    const activeLicense = await this.prisma.license.findFirst({
      where: { organizationId: orgId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (activeLicense) {
      const now = new Date();

      if (activeLicense.expiresAt > now) {
        return {
          licenseState: "active",
          expiresAt: activeLicense.expiresAt,
          maxCameras: activeLicense.maxCameras,
          maxDoors: activeLicense.maxDoors,
        };
      }

      const graceEnd = new Date(
        activeLicense.expiresAt.getTime() +
          activeLicense.gracePeriodDays * 86_400_000,
      );

      if (graceEnd > now) {
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

      if (activeLicense.status !== "EXPIRED") {
        await this.prisma.license.update({
          where: { id: activeLicense.id },
          data: { status: "EXPIRED" },
        });
      }

      return { licenseState: "expired" };
    }

    if (org.trialStartDate && org.trialEndDate && org.trialEndDate > new Date()) {
      return {
        licenseState: "trial",
        trialEndsAt: org.trialEndDate,
        isUnlimited: true,
      };
    }

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

    return { licenseState: "no_license" };
  }

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
}
