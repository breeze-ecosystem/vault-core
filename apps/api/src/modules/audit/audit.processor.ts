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
   * D-16: Writes audit entry to TimescaleDB audit_log hypertable via $queryRaw.
   * The pgcrypto trigger (trg_audit_hash_chain) handles previous_hash
   * and hash computation automatically.
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
        await this.prisma.$queryRaw`
        INSERT INTO audit_log (time, entity, entity_id, action, user_id, organization_id, changes, ip_address, content)
        VALUES (
          ${timestamp}::timestamptz,
          ${entity},
          ${entityId}::uuid,
          ${action},
          ${userId ? `${userId}::uuid` : "NULL::uuid"},
          ${orgId ? `${orgId}::uuid` : "NULL::uuid"},
          ${changes ? JSON.stringify(changes) : null}::jsonb,
          ${ipAddress || null},
          ${content}
        )
      `;
      this.logger.debug(
        `Audit entry written: ${action} on ${entity}/${entityId}`,
      );
      } catch (err: any) {
        this.logger.error(`Failed to write audit entry: ${err.message}`);
        throw err;
      }
    });
  }
}
