import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CLASSIFICATION_LABELS } from "@repo/shared";

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
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
        // Check if pre-purge export is required before pruning
        if (policy.exportBeforePurge) {
          try {
            await this.exportBeforePurge(
              policy.eventType,
              policy.tableType,
              policy.retentionDays,
              policy.exportFormat || "CSV",
            );
            this.logger.log(
              `Pre-purge export completed for ${policy.eventType}`,
            );

            // Audit log for the export
            await this.auditService.log({
              action: "retention.export",
              entity: "RetentionPolicy",
              entityId: policy.id,
              changes: {
                eventType: { new: policy.eventType },
                format: { new: policy.exportFormat || "CSV" },
              },
            });
          } catch (exportErr: any) {
            this.logger.error(
              `Pre-purge export failed for ${policy.eventType}: ${exportErr.message}`,
            );
          }
        }

        await this.retentionQueue.add("prune", {
          eventType: policy.eventType,
          tableType: policy.tableType,
          retentionDays: policy.retentionDays,
          siteId: policy.siteId,
        });
        this.logger.log(
          `Enqueued prune job for ${policy.eventType} (${policy.retentionDays} days)${policy.siteId ? ` site=${policy.siteId}` : " (global)"}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Retention pruning cycle failed: ${err.message}`);
    }
  }

  /**
   * Prune data from a specific table based on retention policy.
   * Supports site-scoped pruning when siteId is provided.
   */
  async prune(eventType: string, tableType: string, retentionDays: number, siteId?: string): Promise<void> {
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

      // Site-scoped or global pruning
      if (siteId) {
        // Most tables have site_id column; audit_log and refresh_token may not
        const columnsWithSiteId = ["access_events", "incident_events", "vehicle_events"];
        if (columnsWithSiteId.includes(eventType)) {
          await this.prisma.$queryRawUnsafe(
            `DELETE FROM "${eventType}" WHERE time < $1::timestamptz AND site_id = $2`,
            cutoff,
            siteId,
          );
        } else {
          // Fall back to global pruning for tables without site_id
          await this.prisma.$queryRawUnsafe(
            `DELETE FROM "${eventType}" WHERE time < $1::timestamptz`,
            cutoff,
          );
        }
      } else {
        await this.prisma.$queryRawUnsafe(
          `DELETE FROM "${eventType}" WHERE time < $1::timestamptz`,
          cutoff,
        );
      }
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
        // notificationLog and auditLog may support siteId if the schema has it
        const where: any = { createdAt: { lt: cutoff } };
        if (siteId && (eventType === "notification_log")) {
          where.siteId = siteId;
        }
        // auditLog uses organizationId for scoping, not siteId directly
        await prismaAny[modelName].deleteMany({ where });
      }
    }

    this.logger.log(`Pruned ${eventType} older than ${retentionDays} days${siteId ? ` (site: ${siteId})` : " (global)"}`);
  }

  // ─── Retention Policy CRUD ───────────────────────────────────────────────────

  async createPolicy(dto: {
    eventType: string;
    tableType: string;
    retentionDays: number;
    enabled?: boolean;
    classification?: string;
    exportBeforePurge?: boolean;
    exportFormat?: string;
    siteId?: string | null;
  }) {
    // Validate classification if provided
    if (dto.classification) {
      this.validateClassification(dto.classification);
    }

    // Validate export format if exportBeforePurge is true
    if (dto.exportBeforePurge && dto.exportFormat) {
      this.validateExportFormat(dto.exportFormat);
    }

    return this.prisma.retentionPolicy.create({
      data: {
        eventType: dto.eventType,
        tableType: dto.tableType,
        retentionDays: dto.retentionDays,
        enabled: dto.enabled ?? true,
        classification: dto.classification ?? null,
        exportBeforePurge: dto.exportBeforePurge ?? false,
        exportFormat: dto.exportFormat ?? null,
        siteId: dto.siteId ?? null,
      },
    });
  }

  async updatePolicy(id: string, dto: {
    retentionDays?: number;
    enabled?: boolean;
    classification?: string;
    exportBeforePurge?: boolean;
    exportFormat?: string;
    siteId?: string | null;
  }) {
    // Validate classification if provided
    if (dto.classification) {
      this.validateClassification(dto.classification);
    }

    // Validate export format if provided
    if (dto.exportFormat) {
      this.validateExportFormat(dto.exportFormat);
    }

    // Check if policy exists before updating
    const existing = await this.prisma.retentionPolicy.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Retention policy ${id} not found`);
    }

    return this.prisma.retentionPolicy.update({
      where: { id },
      data: dto as any,
    });
  }

  async deletePolicy(id: string) {
    const existing = await this.prisma.retentionPolicy.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Retention policy ${id} not found`);
    }
    await this.prisma.retentionPolicy.delete({ where: { id } });
  }

  async listPolicies(orgId?: string, siteId?: string) {
    const where: any = {};

    if (siteId) {
      // Return policies scoped to this specific site
      where.siteId = siteId;
    } else {
      // Return global policies (siteId IS NULL)
      where.siteId = null;
    }

    return this.prisma.retentionPolicy.findMany({
      where,
      orderBy: { eventType: "asc" },
    });
  }

  // ─── Classification & Export ──────────────────────────────────────────────────

  /**
   * Export data that would be deleted by a retention policy before purging.
   * Supports PDF and CSV formats.
   */
  async exportBeforePurge(
    eventType: string,
    tableType: string,
    retentionDays: number,
    format: string,
  ): Promise<{ buffer?: Buffer; text?: string; recordCount: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const rows: Record<string, unknown>[] = [];

    if (tableType === "timescaledb") {
      // For timescaledb hypertables, select rows older than cutoff
      try {
        rows.push(
          ...(await this.prisma.$queryRawUnsafe<
            Record<string, unknown>[]
          >(`SELECT * FROM "${eventType}" WHERE time < $1::timestamptz LIMIT 10000`, cutoff)),
        );
      } catch (err: any) {
        this.logger.warn(
          `Could not query ${eventType} for export: ${err.message}. Returning empty export.`,
        );
      }
    } else if (tableType === "prisma") {
      // For prisma models, select rows older than cutoff
      const modelMap: Record<string, string> = {
        notification_log: "notificationLog",
        refresh_token: "refreshToken",
        audit_log: "auditLog",
      };

      const modelName = modelMap[eventType];
      if (modelName) {
        try {
          const prismaAny = this.prisma as any;
          if (prismaAny[modelName]?.findMany) {
            const result = await prismaAny[modelName].findMany({
              where: { createdAt: { lt: cutoff } },
              take: 10000,
            });
            rows.push(...(result as Record<string, unknown>[]));
          }
        } catch (err: any) {
          this.logger.warn(
            `Could not query ${eventType} for export: ${err.message}. Returning empty export.`,
          );
        }
      }
    }

    const recordCount = rows.length;

    if (format === "PDF") {
      // Generate PDF report of exported data
      const buffer = await this.generateExportPdf(eventType, rows);
      return { buffer, recordCount };
    }

    // Default: CSV format
    const csv = this.convertToCsv(rows);
    return { text: csv, recordCount };
  }

  /**
   * Generate a simple PDF for exported data.
   */
  private generateExportPdf(
    eventType: string,
    rows: Record<string, unknown>[],
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.fontSize(18).font("Helvetica-Bold").text("Export Avant Purge", {
        align: "center",
      });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(`Type d'événement: ${eventType}`);
      doc.text(`Nombre d'enregistrements: ${rows.length}`);
      doc.text(`Date d'export: ${new Date().toLocaleString("fr-FR")}`);
      doc.moveDown();
      doc.text("=".repeat(80), { align: "center" });
      doc.moveDown();

      // Render rows
      if (rows.length === 0) {
        doc.fontSize(12).font("Helvetica-Oblique").text(
          "Aucune donnée à exporter.",
          { align: "center" },
        );
      } else {
        // Show first 50 rows as text summary
        const displayRows = rows.slice(0, 50);
        for (const row of displayRows) {
          doc.fontSize(8).font("Helvetica");
          const rowText = Object.entries(row)
            .map(([key, val]) => `${key}: ${val ?? "N/A"}`)
            .join(" | ");
          doc.text(rowText, { lineBreak: false });
          doc.moveDown(0.2);
        }

        if (rows.length > 50) {
          doc.moveDown();
          doc.fontSize(10).font("Helvetica-Oblique").text(
            `... et ${rows.length - 50} enregistrements supplémentaires.`,
          );
        }
      }

      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica-Oblique").text(
        `Export généré le ${new Date().toLocaleString("fr-FR")} — OVERSIGHT HUB`,
        { align: "center" },
      );

      doc.end();
    });
  }

  /**
   * Convert an array of records to CSV string.
   */
  private convertToCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return "Aucune donnée";

    const headers = Object.keys(rows[0]);
    const csvLines: string[] = [headers.join(",")];

    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape quotes and wrap in quotes if contains comma
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(values.join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Validate that a classification label is one of the allowed values.
   */
  validateClassification(classification: string): void {
    const valid = CLASSIFICATION_LABELS as readonly string[];
    if (!valid.includes(classification)) {
      throw new BadRequestException(
        `Classification invalide. Valeurs acceptées: ${valid.join(", ")}`,
      );
    }
  }

  /**
   * Validate export format.
   */
  private validateExportFormat(format: string): void {
    if (format !== "PDF" && format !== "CSV") {
      throw new BadRequestException(
        "Format d'export invalide. Valeurs acceptées: PDF, CSV",
      );
    }
  }

  /**
   * Get valid classification labels.
   */
  getClassifications(): string[] {
    return [...CLASSIFICATION_LABELS];
  }

  /**
   * Check if encryption is configured.
   */
  isEncryptionConfigured(): boolean {
    const key = this.config.get<string>("encryption.key");
    return !!key && key !== "change-me-to-a-random-32-byte-key";
  }
}
