import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { firstValueFrom } from "rxjs";

interface UsageStats {
  cameraCount: number;
  storageUsed: number;
  uptimePercent: number;
  alertVolume24h: number;
  version: string;
}

interface UpdateInfo {
  latestVersion: string;
  changelogUrl: string;
  releaseDate: string;
  isCritical: boolean;
  minSupportedVersion: string;
}

/**
 * Compare two semver strings (major.minor.patch).
 * Returns true if versionA > versionB.
 */
function isNewerVersion(versionA: string, versionB: string): boolean {
  const parse = (v: string): number[] =>
    v
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map(Number);
  const a = parse(versionA);
  const b = parse(versionB);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    if (va !== vb) return va > vb;
  }
  return false;
}

/** Returns a Date N days ago from now. */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

@Injectable()
export class LicenseVerificationService {
  private readonly logger = new Logger(LicenseVerificationService.name);

  /** In-memory cache of latest update info (persisted across cron cycles) */
  private currentUpdateInfo: UpdateInfo | null = null;

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Returns the latest cached update info (consumed by dashboard banner controller). */
  getLatestUpdateInfo(): UpdateInfo | null {
    return this.currentUpdateInfo;
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async pingVaultApp(): Promise<void> {
    const vaultAppUrl = this.config.get<string>("VAULT_APP_URL");
    if (!vaultAppUrl) {
      this.logger.warn("VAULT_APP_URL not configured — skipping verification ping");
      return;
    }

    const reportApiKey = this.config.get<string>("REPORT_API_KEY") ?? "";

    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    for (const org of orgs) {
      try {
        // 1. Collect usage stats from vault-os database
        const usage = await this.collectUsageStats(org.id);

        // 2. POST usage report to vault-app (replaces GET /api/verify)
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (reportApiKey) {
          headers["Authorization"] = `Bearer ${reportApiKey}`;
        }

        const reportResponse = await firstValueFrom(
          this.http.post<{
            valid: boolean;
            pack?: string;
            expiresAt?: string;
            maxCameras?: number;
          }>(
            `${vaultAppUrl}/api/report`,
            {
              organizationId: org.id,
              organizationName: org.name,
              ...usage,
            },
            { headers, timeout: 10_000 },
          ),
        );

        // Process license status from report response
        if (reportResponse.data.valid) {
          await this.prisma.organization.update({
            where: { id: org.id },
            data: {
              lastVerifiedAt: new Date(),
              lastVerificationFailedAt: null,
            },
          });
        } else {
          await this.prisma.organization.update({
            where: { id: org.id },
            data: {
              lastVerificationFailedAt: new Date(),
            },
          });
        }

        // 3. Check for updates
        const updateResponse = await firstValueFrom(
          this.http.get<{
            latestVersion: string | null;
            changelogUrl?: string;
            releaseDate?: string;
            isCritical?: boolean;
            minSupportedVersion?: string;
            message?: string;
          }>(`${vaultAppUrl}/api/updates/latest`, {
            timeout: 10_000,
          }),
        );

        // 4. If update available and newer than cached, store for dashboard banner
        if (
          updateResponse.data?.latestVersion &&
          (!this.currentUpdateInfo ||
            isNewerVersion(
              updateResponse.data.latestVersion,
              this.currentUpdateInfo.latestVersion,
            ))
        ) {
          this.currentUpdateInfo = {
            latestVersion: updateResponse.data.latestVersion,
            changelogUrl: updateResponse.data.changelogUrl ?? "",
            releaseDate: updateResponse.data.releaseDate ?? "",
            isCritical: updateResponse.data.isCritical ?? false,
            minSupportedVersion:
              updateResponse.data.minSupportedVersion ?? "1.0.0",
          };
          this.logger.log(
            `New update detected: ${this.currentUpdateInfo.latestVersion}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `Ping failed for org ${org.id}: ${err.message}`,
        );
        await this.prisma.organization.update({
          where: { id: org.id },
          data: {
            lastVerificationFailedAt: new Date(),
          },
        });
      }
    }
  }

  private async collectUsageStats(orgId: string): Promise<UsageStats> {
    const [cameraCount, alertVolume24h] = await Promise.all([
      this.prisma.camera.count({ where: { organizationId: orgId } }),
      this.prisma.alert.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: daysAgo(1) },
        },
      }),
    ]);

    // Calculate uptime: cameras with heartbeat in past 24h / total cameras
    let uptimePercent = 100.0;
    if (cameraCount > 0) {
      const onlineCameras = await this.prisma.camera.count({
        where: {
          organizationId: orgId,
          lastHeartbeat: { gte: daysAgo(1) },
        },
      });
      uptimePercent = Math.round((onlineCameras / cameraCount) * 10000) / 100;
    }

    // Estimate storage used from RecordingConfig estimatedStorageGb
    let storageUsed = 0;
    try {
      const recordingConfig = await this.prisma.recordingConfig.findUnique({
        where: { organizationId: orgId },
        select: { estimatedStorageGb: true },
      });
      if (recordingConfig?.estimatedStorageGb != null) {
        storageUsed = Math.round(recordingConfig.estimatedStorageGb * 1024 * 1024 * 1024);
      }
    } catch {
      // RecordingConfig might not exist — default to 0
    }

    const version =
      this.config.get<string>("APP_VERSION") ?? "1.0.0";

    return {
      cameraCount,
      storageUsed,
      uptimePercent,
      alertVolume24h,
      version,
    };
  }
}
