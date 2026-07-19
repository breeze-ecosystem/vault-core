import { Injectable, Logger } from "@nestjs/common";

export interface UpdateInfo {
  latestVersion: string;
  changelogUrl: string;
  releaseDate: string;
  isCritical: boolean;
  minSupportedVersion: string;
}

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  private static latestUpdate: UpdateInfo | null = null;

  /**
   * Store the latest update info in memory.
   * Called by LicenseVerificationService.pingVaultApp() during the 12h cron cycle.
   */
  setLatestUpdate(data: UpdateInfo): void {
    SystemService.latestUpdate = data;
    this.logger.log(`Latest version stored: ${data.latestVersion}`);
  }

  /**
   * Return the latest update info or null if none has been stored yet.
   */
  getLatestUpdate(): { latestVersion: string | null } | UpdateInfo {
    if (!SystemService.latestUpdate) {
      return { latestVersion: null };
    }
    return SystemService.latestUpdate;
  }
}
