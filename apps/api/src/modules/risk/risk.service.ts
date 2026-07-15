import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import type { RiskFactors, RiskScoreDto, RiskTrendPoint, SiteRiskSummary } from "@repo/shared";

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  // Weight configuration (all configurable via properties for future env-var override)
  private readonly WEIGHTS = {
    deniedAttempts: 25,
    openDoorAnomalies: 30,
    anomalyEvents: 25,
    activeIncidents: 15,
    failedReaders: 5,
  };

  // Smoothing factor for Pitfall 2 mitigation (prevents oscillation)
  private readonly SMOOTHING_ALPHA = 0.3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject("REDIS_RISK") private readonly redis: Redis,
  ) {}

  /**
   * On module init, load previous scores from risk_scores hypertable
   * to have baseline for smoothing on first cron run.
   */
  async onModuleInit() {
    try {
      const zones = await this.prisma.zone.findMany({
        where: { isActive: true },
        select: { id: true, organizationId: true },
      });

      for (const zone of zones) {
        const lastScores = await this.prisma.$queryRawUnsafe<
          Array<{ smoothed_score: number; score: number }>
        >(
          `SELECT smoothed_score, score FROM risk_scores
           WHERE zone_id = $1::uuid
           ORDER BY time DESC LIMIT 1`,
          zone.id,
        );

        if (lastScores.length > 0) {
          await this.redis.set(
            `risk:zone:${zone.id}:prev`,
            String(lastScores[0].smoothed_score),
            "EX",
            600,
          );
        }
      }

      this.logger.log(`Risk scoring engine initialized with ${zones.length} active zones`);
    } catch (err: any) {
      this.logger.warn(`Risk scoring init: could not load previous scores: ${err.message}`);
    }
  }

  /**
   * Compute risk scores for all active zones every 5 minutes.
   */
  @Cron("*/5 * * * *")
  async computeAllZoneScores() {
    try {
      const zones = await this.prisma.zone.findMany({
        where: { isActive: true },
        include: { organization: { select: { id: true, name: true } } },
      });

      let criticalCount = 0;
      let elevatedCount = 0;

      for (const zone of zones) {
        try {
          const factors = await this.collectRiskFactors(zone.id, zone.organizationId);
          const rawScore = this.calculateScore(factors);
          const level = this.classifyLevel(rawScore);

          // Load previous smoothed score from Redis cache or hypertable
          let prevSmoothed = await this.redis.get(`risk:zone:${zone.id}:prev`);
          let previousSmoothed = 0;

          if (prevSmoothed !== null) {
            previousSmoothed = parseFloat(prevSmoothed);
          } else {
            try {
              const lastScore = await this.prisma.$queryRawUnsafe<
                Array<{ smoothed_score: number }>
              >(
                `SELECT smoothed_score FROM risk_scores
                 WHERE zone_id = $1::uuid
                 ORDER BY time DESC LIMIT 1`,
                zone.id,
              );
              if (lastScore.length > 0) {
                previousSmoothed = lastScore[0].smoothed_score;
              }
            } catch {
              previousSmoothed = rawScore;
            }
          }

          // Exponential smoothing: smoothed = α × raw + (1 - α) × previous_smoothed
          const smoothedScore = Math.round(
            this.SMOOTHING_ALPHA * rawScore + (1 - this.SMOOTHING_ALPHA) * previousSmoothed,
          );
          const smoothedLevel = this.classifyLevel(smoothedScore);

          // Insert into risk_scores hypertable
          await this.prisma.$queryRawUnsafe(
            `INSERT INTO risk_scores (time, zone_id, organization_id, score, risk_level, factors, smoothed_score)
             VALUES (NOW(), $1::uuid, $2::uuid, $3, $4::risk_level, $5::jsonb, $6)`,
            zone.id,
            zone.organizationId,
            rawScore,
            level,
            JSON.stringify(factors),
            smoothedScore,
          );

          // Cache current score in Redis with 10-min TTL
          const scoreDto: RiskScoreDto = {
            zoneId: zone.id,
            organizationId: zone.organizationId,
            zoneName: zone.name,
            siteName: (zone.organization as any)?.name ?? "",
            score: rawScore,
            smoothedScore,
            riskLevel: smoothedLevel,
            factors,
            timestamp: new Date().toISOString(),
          };
          await this.redis.set(
            `risk:zone:${zone.id}`,
            JSON.stringify(scoreDto),
            "EX",
            600,
          );

          // Cache previous smoothed score for next cycle
          await this.redis.set(
            `risk:zone:${zone.id}:prev`,
            String(smoothedScore),
            "EX",
            600,
          );

          if (smoothedLevel === "critical") criticalCount++;
          if (smoothedLevel === "elevated") elevatedCount++;

          // Emit score-updated event for real-time dashboard updates (gateway forwards to WebSocket)
          this.eventEmitter.emit("risk.score-updated", {
            organizationId: zone.organizationId,
            zoneId: zone.id,
            score: scoreDto,
          });

          // Emit event for critical scores (>= 70)
          if (smoothedScore >= 70) {
            this.eventEmitter.emit("risk.score-critical", {
              zoneId: zone.id,
              organizationId: zone.organizationId,
              score: rawScore,
              smoothedScore,
              level: smoothedLevel,
              factors,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (zoneErr: any) {
          this.logger.error(`Risk scoring failed for zone ${zone.id}: ${zoneErr.message}`);
        }
      }

      this.logger.log(
        `Risk scores computed for ${zones.length} zones, ${criticalCount} critical, ${elevatedCount} elevated`,
      );
    } catch (err: any) {
      this.logger.error(`Risk scoring cron failed: ${err.message}`);
    }
  }

  /**
   * Calculate raw risk score from factors using weighted formula.
   */
  calculateScore(factors: RiskFactors): number {
    const raw =
      Math.min(factors.deniedAttempts / 10, 1) * this.WEIGHTS.deniedAttempts +
      Math.min(factors.openDoorAnomalies / 5, 1) * this.WEIGHTS.openDoorAnomalies +
      Math.min(factors.anomalyEvents / 10, 1) * this.WEIGHTS.anomalyEvents +
      Math.min(factors.activeIncidents / 3, 1) * this.WEIGHTS.activeIncidents +
      Math.min(factors.failedReaders / 2, 1) * this.WEIGHTS.failedReaders;

    // Recency bonus: recent events increase score
    let recencyBonus = 0;
    if (factors.hoursSinceLastEvent < 1) recencyBonus = 10;
    else if (factors.hoursSinceLastEvent < 6) recencyBonus = 5;
    else if (factors.hoursSinceLastEvent < 24) recencyBonus = 2;

    return Math.min(100, Math.round(raw + recencyBonus));
  }

  /**
   * Classify a numeric score into a risk level.
   */
  classifyLevel(score: number): "low" | "moderate" | "elevated" | "critical" {
    if (score >= 70) return "critical";
    if (score >= 40) return "elevated";
    if (score >= 20) return "moderate";
    return "low";
  }

  /**
   * Collect risk factors for a zone from various data sources.
   * Queries use raw SQL for TimescaleDB hypertables and Prisma for models.
   */
  async collectRiskFactors(zoneId: string, organizationId: string): Promise<RiskFactors> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const [deniedResult, doorAnomalyResult, anomalyEventsResult, activeIncidentsResult, failedReadersResult, lastEventResult] =
        await Promise.all([
          // Count denied access events in last 24h for this zone
          this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*)::int as count FROM access_events
             WHERE zone_id = $1::uuid AND decision = 'denied' AND time >= $2::timestamptz`,
            zoneId,
            twentyFourHoursAgo,
          ),

          // Count door anomalies (forced, held-open, unsecured) via doors join
          this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*)::int as count FROM door_state_log dsl
             JOIN doors d ON d.id = dsl.door_id
             WHERE d.zone_id = $1::uuid
             AND dsl.state IN ('forced', 'held-open', 'unsecured')
             AND dsl.time >= $2::timestamptz`,
            zoneId,
            twentyFourHoursAgo,
          ),

          // Count AI anomaly events from alerts (intrusion, loitering, tailgating)
          // Zone determined via CameraDoorMap -> Doors join
          this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*)::int as count FROM alerts a
             WHERE a.metadata->>'type' IN ('intrusion', 'loitering', 'tailgating')
             AND a."createdAt" >= $2::timestamptz
             AND EXISTS (
               SELECT 1 FROM camera_door_maps cdm
               JOIN doors d ON d.id = cdm.door_id
               WHERE cdm.camera_id = a."cameraId" AND d.zone_id = $1::uuid
             )`,
            zoneId,
            twentyFourHoursAgo,
          ),

          // Count active (not resolved/closed) incidents for this site
          this.prisma.incident.count({
            where: {
              organizationId,
              status: { notIn: ["resolved", "closed"] },
            },
          }),

          // Count readers with >10 failed reads in last 24h for this site
          this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(DISTINCT reader_id)::int as count FROM reader_health
             WHERE organization_id = $1::uuid AND failed_reads > 10 AND time >= $2::timestamptz`,
            organizationId,
            twentyFourHoursAgo,
          ),

          // Get hours since last event for this zone
          this.prisma.$queryRawUnsafe<
            Array<{ hours_since: number | null }>
          >(
            `SELECT EXTRACT(EPOCH FROM NOW() - GREATEST(
               COALESCE((SELECT MAX(time) FROM access_events WHERE zone_id = $1::uuid), NOW() - INTERVAL '30 days'),
               COALESCE((SELECT MAX(time) FROM door_state_log dsl JOIN doors d ON d.id = dsl.door_id WHERE d.zone_id = $1::uuid), NOW() - INTERVAL '30 days'),
               COALESCE((SELECT MAX(a."createdAt") FROM alerts a WHERE EXISTS (SELECT 1 FROM camera_door_maps cdm JOIN doors d ON d.id = cdm.door_id WHERE cdm.camera_id = a."cameraId" AND d.zone_id = $1::uuid)), NOW() - INTERVAL '30 days')
             )) / 3600 as hours_since`,
            zoneId,
          ),
        ]);

      return {
        deniedAttempts: Number(deniedResult[0]?.count ?? 0),
        openDoorAnomalies: Number(doorAnomalyResult[0]?.count ?? 0),
        anomalyEvents: Number(anomalyEventsResult[0]?.count ?? 0),
        activeIncidents: Number(activeIncidentsResult ?? 0),
        failedReaders: Number(failedReadersResult[0]?.count ?? 0),
        hoursSinceLastEvent: Math.round(lastEventResult[0]?.hours_since ?? 720),
      };
    } catch (err: any) {
      this.logger.warn(`Failed to collect risk factors for zone ${zoneId}: ${err.message}`);
      return {
        deniedAttempts: 0,
        openDoorAnomalies: 0,
        anomalyEvents: 0,
        activeIncidents: 0,
        failedReaders: 0,
        hoursSinceLastEvent: 720,
      };
    }
  }

  /**
   * Get current risk scores for all zones (optionally filtered by site).
   * Reads from Redis cache first, falls back to hypertable.
   */
  async getCurrentScores(organizationId?: string): Promise<RiskScoreDto[]> {
    try {
      // Try Redis cache first
      const keys = await this.redis.keys(`risk:zone:*`);
      // Filter out keys that end with ":prev" (smoothing baselines)
      const scoreKeys = keys.filter((k) => !k.endsWith(":prev"));

      if (scoreKeys.length > 0) {
        const cached = await Promise.all(
          scoreKeys.map(async (key) => {
            const val = await this.redis.get(key);
            if (!val) return null;
            try {
              return JSON.parse(val) as RiskScoreDto;
            } catch {
              return null;
            }
          }),
        );

        const validScores = cached.filter((s): s is RiskScoreDto => s !== null);
        if (validScores.length > 0) {
          return organizationId
            ? validScores.filter((s) => s.organizationId === organizationId)
            : validScores;
        }
      }

      // Fallback: query hypertable for latest score per zone
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          zone_id: string;
          organization_id: string;
          score: number;
          smoothed_score: number;
          risk_level: string;
          factors: any;
          time: Date;
          zone_name: string;
          site_name: string;
        }>
      >(
        `SELECT DISTINCT ON (rs.zone_id)
                rs.zone_id, rs.organization_id, rs.score, rs.smoothed_score,
                rs.risk_level::text, rs.factors, rs.time,
                z.name AS zone_name, s.name AS site_name
         FROM risk_scores rs
         JOIN zones z ON z.id = rs.zone_id
         JOIN sites s ON s.id = rs.organization_id
         ${organizationId ? "WHERE rs.organization_id = $1::uuid" : ""}
         ORDER BY rs.zone_id, rs.time DESC`,
        ...(organizationId ? [organizationId] : []),
      );

      return rows.map((row) => ({
        zoneId: row.zone_id,
        organizationId: row.organization_id,
        zoneName: row.zone_name,
        siteName: row.site_name,
        score: row.score,
        smoothedScore: row.smoothed_score,
        riskLevel: row.risk_level as RiskScoreDto["riskLevel"],
        factors: typeof row.factors === "string" ? JSON.parse(row.factors) : row.factors,
        timestamp: row.time instanceof Date ? row.time.toISOString() : String(row.time),
      }));
    } catch (err: any) {
      this.logger.error(`Failed to get current risk scores: ${err.message}`);
      return [];
    }
  }

  /**
   * Get trend history for a specific zone over a time range.
   */
  async getZoneScoreHistory(
    zoneId: string,
    from?: string,
    to?: string,
  ): Promise<RiskTrendPoint[]> {
    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          time: Date;
          score: number;
          smoothed_score: number;
          risk_level: string;
        }>
      >(
        `SELECT time, score, smoothed_score, risk_level::text
         FROM risk_scores
         WHERE zone_id = $1::uuid AND time >= $2::timestamptz AND time <= $3::timestamptz
         ORDER BY time ASC`,
        zoneId,
        fromDate,
        toDate,
      );

      return rows.map((row) => ({
        timestamp: row.time instanceof Date ? row.time.toISOString() : String(row.time),
        score: row.score,
        smoothedScore: row.smoothed_score,
        riskLevel: row.risk_level,
      }));
    } catch (err: any) {
      this.logger.warn(`Failed to get zone score history: ${err.message}`);
      return [];
    }
  }

  /**
   * Get per-site risk summaries for the executive dashboard.
   */
  async getSiteRiskSummaries(): Promise<SiteRiskSummary[]> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          organization_id: string;
          site_name: string;
          average_score: number;
          max_score: number;
          zone_count: number;
          critical_zones: number;
          elevated_zones: number;
          last_updated: Date;
        }>
      >(
        `SELECT
           rs.organization_id,
           s.name AS site_name,
           ROUND(AVG(rs.smoothed_score))::int AS average_score,
           MAX(rs.smoothed_score)::int AS max_score,
           COUNT(DISTINCT rs.zone_id)::int AS zone_count,
           COUNT(DISTINCT rs.zone_id) FILTER (WHERE rs.risk_level = 'critical')::int AS critical_zones,
           COUNT(DISTINCT rs.zone_id) FILTER (WHERE rs.risk_level = 'elevated')::int AS elevated_zones,
           MAX(rs.time) AS last_updated
         FROM risk_scores rs
         JOIN sites s ON s.id = rs.organization_id
         WHERE rs.time > NOW() - INTERVAL '5 minutes'
         GROUP BY rs.organization_id, s.name`,
      );

      return rows.map((row) => ({
        organizationId: row.organization_id,
        siteName: row.site_name,
        averageScore: row.average_score,
        maxScore: row.max_score,
        zoneCount: row.zone_count,
        criticalZones: row.critical_zones,
        elevatedZones: row.elevated_zones,
        lastUpdated: row.last_updated instanceof Date ? row.last_updated.toISOString() : String(row.last_updated),
      }));
    } catch (err: any) {
      this.logger.error(`Failed to get site risk summaries: ${err.message}`);
      return [];
    }
  }
}
