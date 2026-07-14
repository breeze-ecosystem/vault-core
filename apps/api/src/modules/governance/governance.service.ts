import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue("retention-pruning") private readonly retentionQueue: Queue,
  ) {}

  // ─── Encryption ──────────────────────────────────────────────────────────────

  /**
   * Encrypt a plaintext value using pgp_sym_encrypt.
   */
  async encrypt(plaintext: string): Promise<string> {
    const key = this.getEncryptionKey();
    const result = await this.prisma.$queryRawUnsafe<Array<{ encrypted: string }>>(
      `SELECT pgp_sym_encrypt($1, $2) as encrypted`,
      plaintext,
      key,
    );
    return result[0].encrypted;
  }

  /**
   * Decrypt an encrypted value using pgp_sym_decrypt.
   */
  async decrypt(encrypted: string): Promise<string> {
    const key = this.getEncryptionKey();
    const result = await this.prisma.$queryRawUnsafe<Array<{ decrypted: string }>>(
      `SELECT pgp_sym_decrypt($1::bytea, $2) as decrypted`,
      encrypted,
      key,
    );
    return result[0].decrypted;
  }

  /**
   * Get the encryption key from config. Throws if not configured.
   */
  private getEncryptionKey(): string {
    const key = this.config.get<string>("encryption.key");
    if (!key || key === "change-me-to-a-random-32-byte-key") {
      throw new BadRequestException(
        "Encryption key is not configured. Set ENCRYPTION_KEY in environment variables.",
      );
    }
    return key;
  }

  // ─── Data Retention ──────────────────────────────────────────────────────────

  /**
   * Hourly cron — checks all enabled retention policies and enqueues pruning jobs.
   */
  @Cron("0 * * * *")
  async pruneExpiredData() {
    this.logger.log("Retention pruning cycle started");

    try {
      const policies = await this.prisma.retentionPolicy.findMany({
        where: { enabled: true },
      });

      for (const policy of policies) {
        await this.retentionQueue.add("prune", {
          eventType: policy.eventType,
          tableType: policy.tableType,
          retentionDays: policy.retentionDays,
        });
        this.logger.log(
          `Enqueued prune job for ${policy.eventType} (${policy.retentionDays} days)`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Retention pruning cycle failed: ${err.message}`);
    }
  }

  /**
   * Prune data from a specific table based on retention policy.
   */
  async prune(eventType: string, tableType: string, retentionDays: number): Promise<void> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    if (tableType === "timescaledb") {
      // Validate event type against known hypertables to prevent injection
      const validHypertables = [
        "access_events",
        "door_state_log",
        "audit_log",
        "incident_events",
        "vehicle_events",
        "reader_health",
        "controller_health",
        "camera_health",
        "event_embeddings",
      ];

      if (!validHypertables.includes(eventType)) {
        this.logger.warn(`Unknown hypertable event type: ${eventType}, skipping`);
        return;
      }

      await this.prisma.$queryRawUnsafe(
        `DELETE FROM "${eventType}" WHERE time < $1::timestamptz`,
        cutoff,
      );
    } else if (tableType === "prisma") {
      // Map event type to Prisma model name
      const modelMap: Record<string, string> = {
        notification_log: "notificationLog",
        refresh_token: "refreshToken",
        audit_log: "auditLog",
      };

      const modelName = modelMap[eventType];
      if (!modelName) {
        this.logger.warn(`Unknown Prisma model for event type: ${eventType}, skipping`);
        return;
      }

      // Use deleteMany based on createdAt field
      const prismaAny = this.prisma as any;
      if (prismaAny[modelName]) {
        await prismaAny[modelName].deleteMany({
          where: { createdAt: { lt: cutoff } },
        });
      }
    }

    this.logger.log(`Pruned ${eventType} older than ${retentionDays} days`);
  }

  // ─── Retention Policy CRUD ───────────────────────────────────────────────────

  async createPolicy(dto: {
    eventType: string;
    tableType: string;
    retentionDays: number;
    enabled?: boolean;
  }) {
    return this.prisma.retentionPolicy.create({
      data: {
        eventType: dto.eventType,
        tableType: dto.tableType,
        retentionDays: dto.retentionDays,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async updatePolicy(id: string, dto: { retentionDays?: number; enabled?: boolean }) {
    return this.prisma.retentionPolicy.update({
      where: { id },
      data: dto,
    });
  }

  async deletePolicy(id: string) {
    await this.prisma.retentionPolicy.delete({ where: { id } });
  }

  async listPolicies() {
    return this.prisma.retentionPolicy.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Check if encryption is configured.
   */
  isEncryptionConfigured(): boolean {
    const key = this.config.get<string>("encryption.key");
    return !!key && key !== "change-me-to-a-random-32-byte-key";
  }
}
