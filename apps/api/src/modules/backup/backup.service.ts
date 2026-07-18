import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { BASTION_EVENT_TYPES } from "@repo/shared";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly webhookService: WebhookService,
  ) {}

  // ─── Path Validation ─────────────────────────────────────────────────

  /**
   * Validate a target path for safety.
   * Rejects paths containing shell-dangerous characters.
   * Accepts CIFS paths (//server/share) and local paths (/path).
   */
  private validatePath(targetPath: string): boolean {
    // Reject shell metacharacters that could enable injection
    const dangerous = /[;|$`"'(){}[\]!\\]/;
    if (dangerous.test(targetPath)) {
      return false;
    }

    // Must start with // (CIFS) or / (local)
    if (!targetPath.startsWith("//") && !targetPath.startsWith("/")) {
      return false;
    }

    return true;
  }

  // ─── Config Management ──────────────────────────────────────────────

  /**
   * Get the backup configuration for an organization.
   * Never returns the password in the response.
   */
  async getConfig(orgId: string) {
    const config = await this.prisma.backupConfig.findUnique({
      where: { organizationId: orgId },
    });

    if (!config) {
      throw new NotFoundException("Backup configuration not found");
    }

    // Never return password
    const { password: _, ...safeConfig } = config;
    return safeConfig;
  }

  /**
   * Save or update backup configuration.
   */
  async saveConfig(orgId: string, dto: {
    targetPath: string;
    username?: string;
    password?: string;
    schedule?: string;
  }) {
    // Validate path before saving
    if (!this.validatePath(dto.targetPath)) {
      throw new BadRequestException(
        "Invalid target path. Must start with // (CIFS) or / (local) and contain no special characters.",
      );
    }

    const data: any = {
      targetPath: dto.targetPath,
      schedule: dto.schedule ?? "daily",
      enabled: true,
    };

    if (dto.username !== undefined) data.username = dto.username;
    if (dto.password !== undefined) data.password = dto.password;

    const config = await this.prisma.backupConfig.upsert({
      where: { organizationId: orgId },
      create: { ...data, organizationId: orgId },
      update: data,
    });

    const { password: _, ...safeConfig } = config;
    return safeConfig;
  }

  // ─── Connection Testing ─────────────────────────────────────────────

  /**
   * Test NAS connection by mounting and verifying access.
   * Always unmounts before returning.
   */
  async testConnection(dto: {
    targetPath: string;
    username?: string;
    password?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!this.validatePath(dto.targetPath)) {
      return {
        success: false,
        message:
          "Invalid target path. Must start with // (CIFS) or / (local) and contain no special characters.",
      };
    }

    const mountPoint = "/tmp/backup-test";
    const isCifs = dto.targetPath.startsWith("//");

    try {
      fs.mkdirSync(mountPoint, { recursive: true });

      if (isCifs) {
        // CIFS mount
        const mountOpts = `username=${dto.username ?? "guest"},password=${dto.password ?? ""},vers=3.0,noexec`;
        execSync(
          `mount -t cifs "${dto.targetPath}" ${mountPoint} -o "${mountOpts}"`,
          { timeout: 15000, stdio: "pipe" },
        );
      } else {
        // Local bind mount (or just check directory exists)
        if (!fs.existsSync(dto.targetPath)) {
          return { success: false, message: "Local path does not exist" };
        }
        // For local paths, we just verify the directory is accessible
        execSync(
          `mount --bind "${dto.targetPath}" ${mountPoint}`,
          { timeout: 10000, stdio: "pipe" },
        );
      }

      // Unmount immediately
      try {
        execSync(`umount ${mountPoint}`, { timeout: 10000, stdio: "pipe" });
      } catch {
        // Best-effort unmount
      }

      this.removeDirSync(mountPoint);

      return { success: true, message: "NAS accessible" };
    } catch (err: any) {
      // Attempt unmount on failure
      try {
        execSync(`umount ${mountPoint} 2>/dev/null || true`, { timeout: 5000 });
      } catch {
        // ignore
      }
      try {
        if (fs.existsSync(mountPoint)) {
          this.removeDirSync(mountPoint);
        }
      } catch {
        // ignore
      }

      return {
        success: false,
        message: `Connection failed: ${err.message.substring(0, 200)}`,
      };
    }
  }

  // ─── Manual Backup ──────────────────────────────────────────────────

  /**
   * Run a manual backup immediately.
   */
  async runManualBackup(orgId: string): Promise<{ jobId: string; status: string }> {
    const config = await this.prisma.backupConfig.findUnique({
      where: { organizationId: orgId },
      include: { organization: true },
    });

    if (!config) {
      throw new NotFoundException("Backup configuration not found");
    }

    // Run asynchronously (fire and forget — the calling context gets job ID)
    this.executeBackup(config as any).catch((err) => {
      this.logger.error(`Manual backup failed for org ${orgId}: ${err.message}`);
    });

    return { jobId: `manual-${orgId}-${Date.now()}`, status: "started" };
  }

  // ─── Scheduled Backup (Daily at 2 AM) ───────────────────────────────

  @Cron("0 2 * * *")
  async runScheduledBackup() {
    this.logger.log("Starting scheduled daily backup for all enabled configurations");

    const configs = await this.prisma.backupConfig.findMany({
      where: { enabled: true },
      include: { organization: true },
    });

    if (configs.length === 0) {
      this.logger.log("No enabled backup configurations found");
      return;
    }

    for (const config of configs) {
      try {
        await this.executeBackup(config as any);
      } catch (err: any) {
        this.logger.error(
          `Scheduled backup failed for org ${config.organizationId}: ${err.message}`,
        );
      }
    }

    this.logger.log(`Scheduled backup completed: ${configs.length} config(s) processed`);
  }

  // ─── Backup Execution ───────────────────────────────────────────────

  /**
   * Execute a full backup cycle:
   * mount → rsync → sha256sum manifest → verify → unmount → log.
   */
  async executeBackup(config: {
    id: string;
    organizationId: string;
    targetPath: string;
    username?: string | null;
    password?: string | null;
    organization?: { name?: string };
  }): Promise<void> {
    const orgId = config.organizationId;
    const mountPoint = `/mnt/backup/${orgId}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const isCifs = config.targetPath.startsWith("//");
    const orgName = config.organization?.name ?? orgId;

    // Create backup job record
    const job = await this.prisma.backupJob.create({
      data: {
        backupConfigId: config.id,
        organizationId: orgId,
        status: "RUNNING",
      },
    });

    this.logger.log(`Backup job ${job.id} started for org ${orgId} → ${config.targetPath}`);

    try {
      // Step 1: Ensure mount point exists and mount
      fs.mkdirSync(mountPoint, { recursive: true });

      if (isCifs) {
        const mountOpts = `username=${config.username ?? "guest"},password=${config.password ?? ""},vers=3.0,noexec`;
        execSync(
          `mount -t cifs "${config.targetPath}" ${mountPoint} -o "${mountOpts}"`,
          { timeout: 30000, stdio: "pipe" },
        );
      } else {
        execSync(
          `mount --bind "${config.targetPath}" ${mountPoint}`,
          { timeout: 15000, stdio: "pipe" },
        );
      }

      this.logger.log(`Mounted backup target at ${mountPoint}`);

      // Step 2: rsync source directories
      const sourceDirs = [
        `/mnt/recordings/${orgId}`,
        `/mnt/snapshots/${orgId}`,
        `/mnt/evidence/${orgId}`,
      ];

      const backupDest = path.join(mountPoint, "backup");

      for (const src of sourceDirs) {
        if (fs.existsSync(src)) {
          this.logger.log(`Syncing ${src} → ${backupDest}`);
          execSync(
            `rsync -avz --delete "${src}/" "${backupDest}/"`,
            { timeout: 3600000, stdio: "pipe" }, // 1 hour timeout for large backups
          );
        } else {
          this.logger.debug(`Source directory ${src} does not exist, skipping`);
        }
      }

      // Step 3: Generate integrity manifest (SHA-256 checksums)
      const manifestPath = path.join(mountPoint, `manifest-${timestamp}.sha256`);
      execSync(
        `find "${backupDest}" -type f -exec sha256sum {} \\; > "${manifestPath}"`,
        { timeout: 600000, stdio: "pipe" }, // 10 min for large directories
      );
      this.logger.log(`Integrity manifest generated at ${manifestPath}`);

      // Step 4: Verify integrity
      this.logger.log("Verifying backup integrity...");
      execSync(
        `sha256sum -c "${manifestPath}"`,
        { timeout: 600000, stdio: "pipe" },
      );
      this.logger.log("Backup integrity verification passed");

      // Step 5: Unmount
      this.safeUnmount(mountPoint);

      // Step 6: Calculate total size
      let totalSize = BigInt(0);
      try {
        const duOutput = execSync(
          `du -sb "${backupDest}" 2>/dev/null | cut -f1`,
          { timeout: 30000, encoding: "utf8" },
        );
        totalSize = BigInt(duOutput.trim() || "0");
      } catch {
        // Size calculation is best-effort
      }

      // Step 7: Mark job as SUCCESS
      await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCESS",
          sizeBytes: totalSize,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Backup job ${job.id} completed successfully (${totalSize} bytes)`);

      // Step 8: Dispatch webhook
      await this.dispatchBackupWebhook(orgId, "success", {
        jobId: job.id,
        orgId,
        orgName,
        sizeBytes: Number(totalSize),
        targetPath: config.targetPath,
        timestamp,
      });
    } catch (err: any) {
      // Attempt to unmount on failure
      this.safeUnmount(mountPoint);

      const errorMsg = err.message.substring(0, 500);

      // Mark job as FAILED
      await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: errorMsg,
          completedAt: new Date(),
        },
      });

      this.logger.error(`Backup job ${job.id} failed: ${errorMsg}`);

      // Dispatch failure webhook
      await this.dispatchBackupWebhook(orgId, "failure", {
        jobId: job.id,
        orgId,
        orgName,
        error: errorMsg,
        targetPath: config.targetPath,
        timestamp,
      });
    }
  }

  // ─── Job History ────────────────────────────────────────────────────

  /**
   * List backup jobs for an organization.
   */
  async listJobs(orgId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.backupJob.findMany({
        where: { organizationId: orgId },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.backupJob.count({
        where: { organizationId: orgId },
      }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Safely unmount a mount point.
   */
  /**
   * Recursively remove a directory (compatible with older Node.js).
   */
  private removeDirSync(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            this.removeDirSync(fullPath);
          } else {
            fs.unlinkSync(fullPath);
          }
        }
        fs.rmdirSync(dirPath);
      }
    } catch {
      // Best-effort cleanup
    }
  }

  private safeUnmount(mountPoint: string): void {
    try {
      execSync(`umount "${mountPoint}" 2>/dev/null || true`, {
        timeout: 15000,
        stdio: "pipe",
      });
    } catch {
      // Best-effort unmount
    }
  }

  /**
   * Dispatch a webhook event for backup completion or failure.
   */
  private async dispatchBackupWebhook(
    orgId: string,
    status: "success" | "failure",
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const eventType =
        status === "success"
          ? BASTION_EVENT_TYPES.BACKUP_COMPLETED
          : BASTION_EVENT_TYPES.BACKUP_FAILED;

      await this.webhookService.dispatchWebhook(eventType, orgId, payload);
      this.logger.log(`Backup webhook dispatched: ${eventType} (org ${orgId})`);
    } catch (err: any) {
      this.logger.warn(
        `Failed to dispatch backup webhook: ${err.message}`,
      );
    }
  }
}
