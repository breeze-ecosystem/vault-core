import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { FastifyRequest } from "fastify";
import type {
  AuditEntry,
  ChainVerificationResult,
  AuditStats,
} from "@repo/shared";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export interface AuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, { old?: unknown; new: unknown }>;
  request?: FastifyRequest;
}

export interface AuditLogFilters {
  userId?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  organizationId?: string;
  entityId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue("audit-write") private auditQueue: Queue,
  ) {}

  /**
   * Create an audit log entry (backward-compatible signature).
   * Now writes to TimescaleDB audit_log hypertable via async queue.
   */
  async log(params: AuditLogParams) {
    const ipAddress = params.request
      ? this.extractIpAddress(params.request)
      : undefined;
    const userAgent = params.request
      ? (params.request.headers["user-agent"] as string) || undefined
      : undefined;
    const timestamp = new Date().toISOString();
    const content = [
      params.entity,
      params.entityId || "unknown",
      params.action,
      params.userId || "system",
      "",
      JSON.stringify(params.changes || {}),
      ipAddress || "",
      timestamp,
    ].join("|");

    try {
      await this.auditQueue.add("write-audit", {
        entity: params.entity,
        entityId: params.entityId || "unknown",
        action: params.action,
        userId: params.userId,
        organizationId: null,
        changes: (params.changes || null) as Record<string, unknown> | null,
        ipAddress,
        userAgent,
        timestamp,
        content,
      });
    } catch {
      // Don't fail the request if audit logging fails
    }
  }

  /**
   * Get paginated audit logs from the hypertable.
   */
  async getLogs(
    filters: AuditLogFilters,
    page: number = 1,
    limit: number = 50,
  ) {
    return this.queryAuditLog({ ...filters, page, limit });
  }

  /**
   * Query audit log with filters (used by controller /audit/logs).
   */
  async queryAuditLog(filters: {
    entity?: string;
    entityId?: string;
    userId?: string;
    organizationId?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const pageNum = filters.page ?? 1;
    const limitNum = Math.min(filters.limit ?? 50, 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity) {
      conditions.push(`entity = $${paramIndex++}`);
      params.push(filters.entity);
    }
    if (filters.entityId) {
      conditions.push(`entity_id = $${paramIndex++}::uuid`);
      params.push(filters.entityId);
    }
    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}::uuid`);
      params.push(filters.userId);
    }
    if (filters.organizationId) {
      conditions.push(`organization_id = $${paramIndex++}::uuid`);
      params.push(filters.organizationId);
    }
    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }
    if (filters.from) {
      conditions.push(`time >= $${paramIndex++}::timestamptz`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`time <= $${paramIndex++}::timestamptz`);
      params.push(filters.to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countParams = [...params];
    const countParamIdx = paramIndex;

    const dataParams = [...params, limitNum, offset];
    const limitParamIdx = paramIndex;
    const offsetParamIdx = paramIndex + 1;

    const dataQuery = `
      SELECT time, entity, entity_id AS "entityId", action,
             user_id AS "userId", organization_id AS "organizationId",
             changes, ip_address AS "ipAddress",
             previous_hash AS "previousHash", hash, content
      FROM audit_log
      ${whereClause}
      ORDER BY time DESC
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM audit_log
      ${whereClause}
    `;

    const [items, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe(dataQuery, ...dataParams) as Promise<
        AuditEntry[]
      >,
      this.prisma.$queryRawUnsafe(countQuery, ...countParams) as Promise<
        { total: number }[]
      >,
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: items,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  /**
   * Verify the cryptographic hash chain for a given entity.
   * D-17: Walks per-entity chain and detects any tampering.
   */
  async verifyChain(
    entity: string,
    entityId: string,
  ): Promise<ChainVerificationResult> {
    const entries = (await this.prisma.$queryRawUnsafe(
      `SELECT time, hash, previous_hash AS "previousHash", content
       FROM audit_log
       WHERE entity = $1 AND entity_id = $2::uuid
       ORDER BY time ASC`,
      entity,
      entityId,
    )) as { time: string; hash: string; previousHash: string | null; content: string }[];

    const tampered: number[] = [];
    const crypto = await import("crypto");

    for (let i = 0; i < entries.length; i++) {
      const expectedInput =
        (i === 0 ? "genesis" : entries[i - 1].hash) + entries[i].content;
      const expectedHash = crypto
        .createHash("sha256")
        .update(expectedInput)
        .digest("hex");

      if (entries[i].hash !== expectedHash) {
        tampered.push(i);
      }
      if (
        i > 0 &&
        entries[i].previousHash !== entries[i - 1].hash
      ) {
        if (!tampered.includes(i)) tampered.push(i);
      }
    }

    return {
      verified: tampered.length === 0,
      totalEntries: entries.length,
      tamperedIndices: tampered,
      genesisHash: entries[0]?.hash ?? null,
      latestHash: entries[entries.length - 1]?.hash ?? null,
    };
  }

  /**
   * Export filtered audit log as JSON or CSV.
   * AUDT-02: Returns filtered audit data as downloadable content.
   */
  async exportAuditLog(filters: {
    entity?: string;
    entityId?: string;
    userId?: string;
    organizationId?: string;
    action?: string;
    from?: string;
    to?: string;
    format?: "json" | "csv";
  }): Promise<{ data: AuditEntry[]; headers: string[]; text: string }> {
    const result = await this.queryAuditLog({
      ...filters,
      page: 1,
      limit: 10000,
    });
    const items = result.data as AuditEntry[];

    const headers = [
      "time",
      "entity",
      "entityId",
      "action",
      "userId",
      "organizationId",
      "changes",
      "ipAddress",
      "hash",
      "previousHash",
    ];

    if (filters.format === "csv") {
      const csvRows = [headers.join(",")];
      for (const item of items) {
        csvRows.push(
          [
            item.time,
            item.entity,
            item.entityId,
            item.action,
            item.userId ?? "",
            item.organizationId ?? "",
            item.changes ? JSON.stringify(item.changes).replace(/"/g, '""') : "",
            item.ipAddress ?? "",
            item.hash,
            item.previousHash ?? "",
          ]
            .map((v) => `"${v}"`)
            .join(","),
        );
      }
      return { data: items, headers, text: csvRows.join("\n") };
    }

    return { data: items, headers, text: JSON.stringify(items, null, 2) };
  }

  /**
   * Get aggregated audit log statistics (backward-compatible signature).
   */
  async getStats(filters?: { from?: string; to?: string }) {
    return this.getAuditStats(filters?.from, filters?.to);
  }

  /**
   * Get aggregated audit statistics from the hypertable.
   */
  async getAuditStats(
    from?: string,
    to?: string,
  ): Promise<AuditStats> {
    const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to ?? new Date().toISOString();

    const [totalResult] = (await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total
       FROM audit_log
       WHERE time >= $1::timestamptz AND time <= $2::timestamptz`,
      fromDate,
      toDate,
    )) as { total: number }[];

    const byEntity = (await this.prisma.$queryRawUnsafe(
      `SELECT entity, COUNT(*)::int AS count
       FROM audit_log
       WHERE time >= $1::timestamptz AND time <= $2::timestamptz
       GROUP BY entity
       ORDER BY count DESC`,
      fromDate,
      toDate,
    )) as { entity: string; count: number }[];

    const byAction = (await this.prisma.$queryRawUnsafe(
      `SELECT action, COUNT(*)::int AS count
       FROM audit_log
       WHERE time >= $1::timestamptz AND time <= $2::timestamptz
       GROUP BY action
       ORDER BY count DESC`,
      fromDate,
      toDate,
    )) as { action: string; count: number }[];

    const byHour = (await this.prisma.$queryRawUnsafe(
      `SELECT time_bucket('1 hour', time) AS hour, COUNT(*)::int AS count
       FROM audit_log
       WHERE time >= $1::timestamptz AND time <= $2::timestamptz
       GROUP BY hour
       ORDER BY hour DESC
       LIMIT 168`,
      fromDate,
      toDate,
    )) as { hour: string; count: number }[];

    const byEntityMap: Record<string, number> = {};
    for (const row of byEntity) {
      byEntityMap[row.entity] = row.count;
    }
    const byActionMap: Record<string, number> = {};
    for (const row of byAction) {
      byActionMap[row.action] = row.count;
    }

    return {
      totalEntries: totalResult?.total ?? 0,
      byEntity: byEntityMap,
      byAction: byActionMap,
      byHour: byHour.map((r) => ({
        hour: r.hour,
        count: r.count,
      })),
    };
  }

  private extractIpAddress(request: FastifyRequest): string | undefined {
    const forwarded = request.headers["x-forwarded-for"];
    const xff = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return (
      xff?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.ip ||
      undefined
    );
  }
}
