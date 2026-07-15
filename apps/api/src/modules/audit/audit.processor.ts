import crypto from "crypto";
import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import type { AuditJobData } from "./audit.interceptor";
import { withTenantContext } from "../../common/helpers/tenant-worker";

@Processor("audit-write")
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<AuditJobData, any, string>): Promise<any> {
    switch (job.name) {
      case "write-audit":
        return this.writeAuditEntry(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * D-11: Writes audit entry to TimescaleDB audit_log hypertable via $queryRaw.
   * Computes SHA-256 hash chain per organization.
   * The pgcrypto trigger (trg_audit_hash_chain) also computes the same
   * org-level hash as defense-in-depth.
   */
  private async writeAuditEntry(data: AuditJobData) {
    const {
      entity,
      entityId,
      action,
      userId,
      orgId,
      changes,
      ipAddress,
      timestamp,
      content,
    } = data;

    if (!orgId) {
      this.logger.warn(`Audit job missing orgId — skipping`);
      return;
    }
    return withTenantContext(this.prisma, orgId, async () => {
      try {
        // D-11: Fetch the last entry's hash for this organization
        const [lastEntry] = await this.prisma.$queryRawUnsafe<
          { hash: string }[]
        >(
          `SELECT hash FROM audit_log WHERE organization_id = $1::uuid ORDER BY time DESC LIMIT 1`,
          orgId,
        );
        const previousHash = lastEntry?.hash ?? "genesis";
        const currentHash = crypto
          .createHash("sha256")
          .update(previousHash + content)
          .digest("hex");

        await this.prisma.$queryRaw`
          INSERT INTO audit_log (time, entity, entity_id, action, user_id, organization_id, changes, ip_address, content, previous_hash, hash)
          VALUES (
            ${timestamp}::timestamptz,
            ${entity},
            ${entityId}::uuid,
            ${action},
            ${userId ? `${userId}::uuid` : "NULL::uuid"},
            ${orgId ? `${orgId}::uuid` : "NULL::uuid"},
            ${changes ? JSON.stringify(changes) : null}::jsonb,
            ${ipAddress || null},
            ${content},
            ${previousHash},
            ${currentHash}
          )
        `;
        this.logger.debug(
          `Audit entry written: ${action} on ${entity}/${entityId} (hash: ${currentHash.slice(0, 8)}...)`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to write audit entry: ${err.message}`);
        throw err;
      }
    });
  }
}
