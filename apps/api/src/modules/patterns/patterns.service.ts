import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import type { DetectedPatternDto, PatternsQueryParams } from "@repo/shared";

// ─── Pattern Definitions ────────────────────────────────────────────────────
// Each pattern defines a SQL frequency analysis query against a TimescaleDB
// hypertable. Queries use $N placeholders for parameterized execution.
// Patterns detect recurring situations that might be missed as individual events.

export interface PatternRule {
  id: string;
  name: string;
  description: string;
  query: string;
  params: [string, number]; // [interval, threshold_count]
  severity: string;
}

const PATTERNS: PatternRule[] = [
  {
    id: "door-repeated-forced",
    name: "Porte forcée répétée",
    description: "La même porte a été forcée à plusieurs reprises dans un court laps de temps",
    query: `
      SELECT door_id, organization_id, COUNT(*) as occurrence_count
      FROM door_state_log
      WHERE state = 'forced' AND time > NOW() - $1::interval
      GROUP BY door_id, organization_id
      HAVING COUNT(*) >= $2
    `,
    params: ["1 hour", 3],
    severity: "HIGH",
  },
  {
    id: "door-repeated-held-open",
    name: "Porte maintenue ouverte répétée",
    description: "La même porte a été maintenue ouverte anormalement à plusieurs reprises",
    query: `
      SELECT door_id, organization_id, COUNT(*) as occurrence_count
      FROM door_state_log
      WHERE state = 'held-open' AND time > NOW() - $1::interval
      GROUP BY door_id, organization_id
      HAVING COUNT(*) >= $2
    `,
    params: ["1 hour", 3],
    severity: "MEDIUM",
  },
  {
    id: "reader-high-failure-rate",
    name: "Taux d'échec de lecteur élevé",
    description: "Un lecteur présente un nombre élevé d'échecs de lecture, indiquant un possible dysfonctionnement",
    query: `
      SELECT reader_id, organization_id, COUNT(*) as occurrence_count
      FROM reader_health
      WHERE failed_reads > 5 AND time > NOW() - $1::interval
      GROUP BY reader_id, organization_id
      HAVING COUNT(*) >= $2
    `,
    params: ["6 hours", 10],
    severity: "MEDIUM",
  },
  {
    id: "camera-fps-drops",
    name: "Chutes FPS caméra",
    description: "Une caméra subit des chutes de FPS répétées, indiquant un possible problème de réseau ou de charge",
    query: `
      SELECT camera_id, organization_id, COUNT(*) as occurrence_count
      FROM camera_health
      WHERE fps_actual IS NOT NULL AND fps_actual < fps_expected * 0.5
      AND time > NOW() - $1::interval
      GROUP BY camera_id, organization_id
      HAVING COUNT(*) >= $2
    `,
    params: ["2 hours", 5],
    severity: "MEDIUM",
  },
  {
    id: "door-repeated-denied",
    name: "Accès refusé répété",
    description: "Des tentatives d'accès refusées répétées sur une même porte",
    query: `
      SELECT door_id, organization_id, COUNT(*) as occurrence_count
      FROM access_events
      WHERE decision = 'denied' AND time > NOW() - $1::interval
      GROUP BY door_id, organization_id
      HAVING COUNT(*) >= $2
    `,
    params: ["1 hour", 10],
    severity: "LOW",
  },
];

@Injectable()
export class PatternsService {
  private readonly logger = new Logger(PatternsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject("REDIS_PATTERNS") private redis: Redis,
    @InjectQueue("recurring-patterns") private patternsQueue: Queue,
  ) {}

  /**
   * Returns the static pattern definitions as a read-only config reference.
   */
  getPatternDefinitions(): PatternRule[] {
    return PATTERNS;
  }

  /**
   * Main pattern detection loop — runs every 15 minutes.
   * For each pattern definition, executes a frequency analysis SQL query against
   * the relevant TimescaleDB hypertable. Detected patterns are written to the
   * detected_patterns hypertable with Redis dedup to prevent re-alerting.
   */
  @Cron("*/15 * * * *")
  async detectPatterns() {
    this.logger.log("Starting pattern detection cycle...");
    let totalDetected = 0;

    for (const pattern of PATTERNS) {
      try {
        const results = await this.prisma.$queryRawUnsafe<
          Array<{
            door_id?: string;
            reader_id?: string;
            camera_id?: string;
            organization_id: string;
            occurrence_count: number;
          }>
        >(pattern.query, pattern.params[0], pattern.params[1]);

        for (const result of results) {
          const deviceId =
            result.door_id || result.reader_id || result.camera_id;
          if (!deviceId) continue;

          // Redis dedup — skip if this pattern was already detected for this device
          const dedupKey = `pattern:dedup:${pattern.id}:${deviceId}`;
          const alreadyReported = await this.redis.exists(dedupKey);
          if (alreadyReported) continue;

          // Determine device type from pattern or result shape
          const deviceType = pattern.id.includes("door")
            ? "door"
            : pattern.id.includes("reader")
              ? "reader"
              : "camera";

          // Write to detected_patterns hypertable
          try {
            await this.prisma.$queryRawUnsafe(
              `INSERT INTO detected_patterns (time, organization_id, pattern_id, pattern_name,
               device_type, device_id, occurrence_count, severity)
               VALUES (NOW(), $1::uuid, $2, $3, $4, $5::uuid, $6, $7::pattern_severity)`,
              result.organization_id,
              pattern.id,
              pattern.name,
              deviceType,
              deviceId,
              result.occurrence_count,
              pattern.severity,
            );
          } catch (insertErr: any) {
            this.logger.warn(
              `Failed to insert detected pattern ${pattern.id}:${deviceId}: ${insertErr.message}`,
            );
            continue;
          }

          // Emit event for real-time notification
          this.eventEmitter.emit("pattern.detected", {
            patternId: pattern.id,
            patternName: pattern.name,
            deviceId,
            deviceType,
            organizationId: result.organization_id,
            severity: pattern.severity,
            occurrenceCount: result.occurrence_count,
            timestamp: new Date().toISOString(),
          });

          // Set dedup key (prevent re-detection for 6 hours)
          await this.redis.set(dedupKey, "1", "EX", 21600);

          totalDetected++;
          this.logger.log(
            `Pattern detected: ${pattern.id} on ${deviceType} ${deviceId} (${result.occurrence_count} occurrences)`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Pattern detection query failed for ${pattern.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Pattern detection cycle complete: ${totalDetected} new patterns detected`,
    );
  }

  /**
   * Query detected patterns with filtering and pagination.
   */
  async getDetectedPatterns(
    params: PatternsQueryParams,
  ): Promise<{ data: DetectedPatternDto[]; total: number }> {
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.organizationId) {
      conditions.push(`organization_id = $${paramIndex}::uuid`);
      queryParams.push(params.organizationId);
      paramIndex++;
    }

    if (params.deviceType) {
      conditions.push(`device_type = $${paramIndex}`);
      queryParams.push(params.deviceType);
      paramIndex++;
    }

    if (params.severity) {
      conditions.push(`severity = $${paramIndex}::pattern_severity`);
      queryParams.push(params.severity);
      paramIndex++;
    }

    if (params.resolved !== undefined) {
      conditions.push(`resolved = $${paramIndex}`);
      queryParams.push(params.resolved);
      paramIndex++;
    }

    if (params.from) {
      conditions.push(`time >= $${paramIndex}::timestamptz`);
      queryParams.push(params.from);
      paramIndex++;
    }

    if (params.to) {
      conditions.push(`time <= $${paramIndex}::timestamptz`);
      queryParams.push(params.to);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const countResult = await this.prisma.$queryRawUnsafe<
      Array<{ total: bigint }>
    >(`SELECT COUNT(*) as total FROM detected_patterns ${whereClause}`, ...queryParams);

    const total = Number(countResult[0]?.total || 0);

    // Paginated results
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT time, organization_id, pattern_id, pattern_name, device_type, device_id,
              occurrence_count, severity, metadata, resolved, resolved_at
       FROM detected_patterns
       ${whereClause}
       ORDER BY time DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...queryParams,
      limit,
      offset,
    );

    // Generate composite IDs and map to DTOs
    const data: DetectedPatternDto[] = rows.map((row: any, idx: number) => ({
      id: `${row.pattern_id}-${row.device_id}-${idx}`,
      time: row.time instanceof Date ? row.time.toISOString() : String(row.time),
      organizationId: row.organization_id,
      patternId: row.pattern_id,
      patternName: row.pattern_name,
      deviceType: row.device_type,
      deviceId: row.device_id,
      occurrenceCount: Number(row.occurrence_count),
      severity: row.severity,
      metadata: row.metadata,
      resolved: row.resolved,
      resolvedAt: row.resolved_at
        ? row.resolved_at instanceof Date
          ? row.resolved_at.toISOString()
          : String(row.resolved_at)
        : undefined,
    }));

    return { data, total };
  }

  /**
   * Get a single detected pattern by pattern_id + device_id composite.
   */
  async getPatternById(id: string): Promise<DetectedPatternDto | null> {
    // For the composite query approach, the id is pattern_id-device_id
    const parts = id.split("-");
    if (parts.length < 2) return null;

    // Reconstruct: the pattern_id can contain hyphens, so we need the deviceId
    // which is a UUID at the end. We find the deviceId by looking for a UUID pattern.
    const deviceId = parts[parts.length - 1];
    // Check if it looks like a UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)) {
      return null;
    }

    // pattern_id = everything between the first segment and the last segment (deviceId)
    // Since pattern_id doesn't contain UUIDs, we can join everything except the last element
    const patternId = parts.slice(0, -1).join("-");

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT time, organization_id, pattern_id, pattern_name, device_type, device_id,
              occurrence_count, severity, metadata, resolved, resolved_at
       FROM detected_patterns
       WHERE pattern_id = $1 AND device_id = $2::uuid
       ORDER BY time DESC
       LIMIT 1`,
      patternId,
      deviceId,
    );

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      id,
      time: row.time instanceof Date ? row.time.toISOString() : String(row.time),
      organizationId: row.organization_id,
      patternId: row.pattern_id,
      patternName: row.pattern_name,
      deviceType: row.device_type,
      deviceId: row.device_id,
      occurrenceCount: Number(row.occurrence_count),
      severity: row.severity,
      metadata: row.metadata,
      resolved: row.resolved,
      resolvedAt: row.resolved_at
        ? row.resolved_at instanceof Date
          ? row.resolved_at.toISOString()
          : String(row.resolved_at)
        : undefined,
    };
  }

  /**
   * Mark a pattern as resolved. Uses composite lookup (pattern_id + device_id).
   * For MVP, resolves the most recent matching record.
   */
  async resolvePattern(id: string, deviceId: string): Promise<void> {
    await this.prisma.$queryRawUnsafe(
      `UPDATE detected_patterns
       SET resolved = TRUE, resolved_at = NOW()
       WHERE pattern_id = $1 AND device_id = $2::uuid AND resolved = FALSE`,
      id,
      deviceId,
    );

    this.logger.log(`Pattern resolved: ${id} on device ${deviceId}`);
  }

  // ── Redis Helpers ──

  /**
   * Check if a debounce key exists in Redis.
   */
  async checkDebounce(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * Set a debounce key with TTL in Redis.
   */
  async setDebounce(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, "1", "EX", ttlSeconds);
    } catch {
      // Redis not available — skip debounce
    }
  }
}
