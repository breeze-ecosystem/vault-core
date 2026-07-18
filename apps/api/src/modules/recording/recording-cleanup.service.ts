import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class RecordingCleanupService {
  private readonly logger = new Logger(RecordingCleanupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Daily retention cleanup — runs daily at 3:00 AM.
   * Reads all organization recording configs and deletes segments
   * older than the configured retention period.
   */
  @Cron("0 3 * * *")
  async cleanup(): Promise<void> {
    this.logger.log("Starting daily retention cleanup...");

    try {
      const orgConfigs = await this.prisma.recordingConfig.findMany({
        include: {
          organization: {
            include: {
              cameras: { select: { id: true } },
            },
          },
        },
      });

      let totalDeleted = 0;
      let totalSizeFreed = 0;

      for (const config of orgConfigs) {
        const retentionDays = config.retentionDays || 7;
        const basePath = config.storagePath || "/mnt/recordings";
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        for (const camera of config.organization.cameras) {
          const cameraDir = path.join(basePath, camera.id);

          if (!fs.existsSync(cameraDir)) continue;

          try {
            const dateDirs = fs.readdirSync(cameraDir, { withFileTypes: true });
            for (const dir of dateDirs) {
              if (!dir.isDirectory()) continue;

              // Date folder format: YYYY-MM-DD
              const dirDate = new Date(dir.name + "T00:00:00Z");
              if (isNaN(dirDate.getTime())) continue;

              if (dirDate < cutoffDate) {
                const fullDir = path.join(cameraDir, dir.name);
                const dirSize = this.getDirectorySize(fullDir);

                this.removeRecursive(fullDir);
                totalDeleted++;
                totalSizeFreed += dirSize;

                this.logger.debug(`Deleted old recording: ${fullDir} (${this.formatBytes(dirSize)})`);
              }
            }
          } catch (err: any) {
            this.logger.error(`Error cleaning camera ${camera.id}: ${err.message}`);
          }
        }
      }

      this.logger.log(
        `Cleanup complete: deleted ${totalDeleted} day(s) of recordings, freed ${this.formatBytes(totalSizeFreed)}`,
      );
    } catch (err: any) {
      this.logger.error(`Retention cleanup failed: ${err.message}`);
    }
  }

  async getStorageUsage(orgId: string): Promise<{
    total: number;
    used: number;
    percent: number;
  }> {
    const config = await this.prisma.recordingConfig.findUnique({
      where: { organizationId: orgId },
    });

    const cameraIds = await this.prisma.camera.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    const basePath = config?.storagePath || "/mnt/recordings";
    let usedBytes = 0;

    for (const camera of cameraIds) {
      const cameraDir = path.join(basePath, camera.id);
      if (fs.existsSync(cameraDir)) {
        try {
          usedBytes += this.getDirectorySize(cameraDir);
        } catch {
          // Permission or other error — skip
        }
      }
    }

    // Estimate total disk capacity (default 500GB)
    let totalBytes = 500 * 1024 * 1024 * 1024; // 500 GB default

    try {
      // On Linux, use statvfs to get actual filesystem stats
      const { execSync } = require("child_process");
      const dfOutput = execSync(`df -B1 ${basePath} 2>/dev/null | tail -1`, { encoding: "utf8" });
      const parts = dfOutput.trim().split(/\s+/);
      if (parts.length >= 4) {
        totalBytes = parseInt(parts[1], 10);
      }
    } catch {
      // Fall back to default
    }

    const percent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

    return {
      total: totalBytes,
      used: usedBytes,
      percent: Math.min(percent, 100),
    };
  }

  // ── Private helpers ──

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        totalSize += fs.statSync(fullPath).size;
      } else if (entry.isDirectory()) {
        totalSize += this.getDirectorySize(fullPath);
      }
    }
    return totalSize;
  }

  private removeRecursive(dirPath: string): void {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        this.removeRecursive(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    fs.rmdirSync(dirPath);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
