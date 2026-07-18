import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ZoneAnalyticsDto,
  SiteAnalyticsDto,
  IntrusionEventDto,
  LoiteringEventDto,
  AbnormalActivityDto,
  AnalyticsTrendPoint,
} from '@repo/shared';
import { BastionAnalyticsService, type AdvancedSearchFilters } from './bastion-analytics.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private readonly bastionAnalytics: BastionAnalyticsService,
  ) {}

  async getZoneAnalytics(
    organizationId?: string,
    zoneId?: string,
    from?: string,
    to?: string,
    granularity: 'hourly' | 'daily' = 'hourly',
  ): Promise<ZoneAnalyticsDto[]> {
    const table = granularity === 'daily' ? 'zone_analytics_hourly' : 'zone_analytics_hourly';
    // zone_analytics_hourly is the only zone-level continuous aggregate
    // daily rollup at zone level would be computed from hourly

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      conditions.push(`zah.organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
      paramIndex++;
    }
    if (zoneId) {
      conditions.push(`zah.zone_id = $${paramIndex}::uuid`);
      params.push(zoneId);
      paramIndex++;
    }
    if (from) {
      conditions.push(`zah.bucket >= $${paramIndex}::timestamptz`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      conditions.push(`zah.bucket <= $${paramIndex}::timestamptz`);
      params.push(to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          zah.zone_id AS "zoneId",
          zah.organization_id AS "organizationId",
          z.name AS "zoneName",
          zah.bucket::text AS "bucket",
          COALESCE(zah.denied_count, 0) AS "deniedCount",
          COALESCE(zah.granted_count, 0) AS "grantedCount",
          COALESCE(zah.door_anomaly_count, 0) AS "doorAnomalyCount",
          COALESCE(zah.unsecured_count, 0) AS "unsecuredCount",
          COALESCE(zah.active_doors, 0) AS "activeDoors"
        FROM zone_analytics_hourly zah
        JOIN zones z ON z.id = zah.zone_id
        ${whereClause}
        ORDER BY zah.bucket DESC
        LIMIT 100`,
        ...params,
      );

      return rows as unknown as ZoneAnalyticsDto[];
    } catch (err: any) {
      this.logger.warn(`getZoneAnalytics query failed, falling back to raw events: ${err.message}`);
      // Fallback: query raw events directly
      return this.getZoneAnalyticsFallback(organizationId, zoneId, from, to);
    }
  }

  private async getZoneAnalyticsFallback(
    organizationId?: string,
    zoneId?: string,
    from?: string,
    to?: string,
  ): Promise<ZoneAnalyticsDto[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      conditions.push(`ae.organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
      paramIndex++;
    }
    if (zoneId) {
      conditions.push(`z.id = $${paramIndex}::uuid`);
      params.push(zoneId);
      paramIndex++;
    }
    if (from) {
      conditions.push(`ae.time >= $${paramIndex}::timestamptz`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      conditions.push(`ae.time <= $${paramIndex}::timestamptz`);
      params.push(to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          z.id AS "zoneId",
          z.organization_id AS "organizationId",
          z.name AS "zoneName",
          NOW()::text AS "bucket",
          COALESCE(SUM(CASE WHEN ae.decision = 'denied' THEN 1 ELSE 0 END), 0) AS "deniedCount",
          COALESCE(SUM(CASE WHEN ae.decision = 'granted' THEN 1 ELSE 0 END), 0) AS "grantedCount",
          0 AS "doorAnomalyCount",
          0 AS "unsecuredCount",
          COUNT(DISTINCT ae.door_id) AS "activeDoors"
        FROM zones z
        JOIN doors d ON d.zone_id = z.id
        LEFT JOIN access_events ae ON ae.door_id = d.id
        ${whereClause}
        GROUP BY z.id, z.organization_id, z.name
        LIMIT 100`,
        ...params,
      );

      return rows as unknown as ZoneAnalyticsDto[];
    } catch (fallbackErr: any) {
      this.logger.error(`getZoneAnalytics fallback also failed: ${fallbackErr.message}`);
      return [];
    }
  }

  async getSiteAnalytics(
    organizationId?: string,
    from?: string,
    to?: string,
  ): Promise<SiteAnalyticsDto[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      conditions.push(`sad.organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
      paramIndex++;
    }
    if (from) {
      conditions.push(`sad.bucket >= $${paramIndex}::timestamptz`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      conditions.push(`sad.bucket <= $${paramIndex}::timestamptz`);
      params.push(to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          sad.organization_id AS "organizationId",
          s.name AS "siteName",
          sad.bucket::text AS "bucket",
          COALESCE(sad.total_denied, 0) AS "totalDenied",
          COALESCE(sad.total_granted, 0) AS "totalGranted",
          COALESCE(sad.doors_with_anomalies, 0) AS "doorsWithAnomalies",
          COALESCE(sad.doors_unsecured, 0) AS "doorsUnsecured",
          COALESCE(sad.incidents_created, 0) AS "incidentsCreated"
        FROM site_analytics_daily sad
        JOIN sites s ON s.id = sad.organization_id
        ${whereClause}
        ORDER BY sad.bucket DESC
        LIMIT 100`,
        ...params,
      );

      return rows as unknown as SiteAnalyticsDto[];
    } catch (err: any) {
      this.logger.warn(`getSiteAnalytics query failed: ${err.message}`);
      return [];
    }
  }

  async getIntrusionEvents(
    organizationId?: string,
    from?: string,
    to?: string,
  ): Promise<IntrusionEventDto[]> {
    const conditions: string[] = ["a.metadata->>'type' = 'intrusion'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      conditions.push(`a.organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
      paramIndex++;
    }
    if (from) {
      conditions.push(`a.created_at >= $${paramIndex}::timestamptz`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      conditions.push(`a.created_at <= $${paramIndex}::timestamptz`);
      params.push(to);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          a.id,
          COALESCE(a.metadata->>'zone_id', '') AS "zoneId",
          a.organization_id AS "organizationId",
          a.metadata->>'door_id' AS "doorId",
          a.created_at::text AS "detectedAt",
          a.camera_id AS "cameraId",
          a.snapshot_url AS "snapshotUrl",
          COALESCE(CAST(a.metadata->>'confidence' AS FLOAT), 0.0) AS "confidence",
          a.status
        FROM alerts a
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT 50`,
        ...params,
      );

      return rows as unknown as IntrusionEventDto[];
    } catch (err: any) {
      this.logger.warn(`getIntrusionEvents query failed: ${err.message}`);
      return [];
    }
  }

  async getLoiteringEvents(
    organizationId?: string,
    from?: string,
    to?: string,
  ): Promise<LoiteringEventDto[]> {
    const durationThreshold = 300; // 5 minutes in seconds

    const conditions: string[] = [
      `dsl.state = 'held-open'`,
      `EXTRACT(EPOCH FROM (NOW() - dsl.time)) > $${1}`,
    ];
    const params: any[] = [durationThreshold];
    let paramIndex = 2;

    if (organizationId) {
      conditions.push(`dsl.organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
      paramIndex++;
    }
    if (from) {
      conditions.push(`dsl.time >= $${paramIndex}::timestamptz`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      conditions.push(`dsl.time <= $${paramIndex}::timestamptz`);
      params.push(to);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          dsl.door_id AS "doorId",
          dsl.organization_id AS "organizationId",
          d.name AS "doorName",
          d.zone_id AS "zoneId",
          dsl.time::text AS "startedAt",
          EXTRACT(EPOCH FROM (NOW() - dsl.time)) AS "durationSeconds",
          dsl.time::text AS "detectedAt",
          dsl.organization_id::text AS "id"
        FROM door_state_log dsl
        JOIN doors d ON d.id = dsl.door_id
        ${whereClause}
        ORDER BY dsl.time DESC
        LIMIT 50`,
        ...params,
      );

      return rows.map((row: any) => ({
        id: `loitering-${row.doorId}-${row.startedAt}`,
        zoneId: row.zoneId || '',
        organizationId: row.organizationId,
        startedAt: row.startedAt,
        durationSeconds: Math.round(Number(row.durationSeconds) || 0),
        maxConfidence: 0,
        status: 'detected',
        cameraId: undefined,
      })) as LoiteringEventDto[];
    } catch (err: any) {
      this.logger.warn(`getLoiteringEvents query failed: ${err.message}`);
      return [];
    }
  }

  async getUnusualAbsence(
    organizationId?: string,
    zoneId?: string,
  ): Promise<AbnormalActivityDto[]> {
    // Detect zones with zero granted events in the last 2 hours
    // when the zone has doors with active schedules
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      conditions.push(`z.organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
      paramIndex++;
    }
    if (zoneId) {
      conditions.push(`z.id = $${paramIndex}::uuid`);
      params.push(zoneId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          z.id AS "zoneId",
          z.organization_id AS "organizationId",
          z.name AS "zoneName",
          0 AS "currentValue",
          0 AS "baselineMean",
          0 AS "baselineStdDev"
        FROM zones z
        WHERE z.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM access_events ae
          JOIN doors d ON d.id = ae.door_id
          WHERE d.zone_id = z.id
          AND ae.decision = 'granted'
          AND ae.time > NOW() - INTERVAL '2 hours'
        )
        ${whereClause}
        LIMIT 20`,
        ...params,
      );

      return rows.map((row: any) => ({
        zoneId: row.zoneId,
        organizationId: row.organizationId,
        metric: 'unusual_absence',
        currentValue: 0,
        baselineMean: row.baselineMean,
        baselineStdDev: row.baselineStdDev,
        deviation: -1,
        severity: 'MEDIUM' as const,
        detectedAt: new Date().toISOString(),
      })) as AbnormalActivityDto[];
    } catch (err: any) {
      this.logger.warn(`getUnusualAbsence query failed: ${err.message}`);
      return [];
    }
  }

  async getAbnormalActivity(
    organizationId?: string,
    zoneId?: string,
  ): Promise<AbnormalActivityDto[]> {
    // Compute z-score deviation: compare current hour denied/anomaly count
    // against 7-day baseline for same day-of-week + hour
    const minZScore = 2.0;

    const conditions: string[] = [];
    const params: any[] = [minZScore];
    let paramIndex = 2;

    if (organizationId) {
      conditions.push(`zah.organization_id = $${paramIndex}::uuid`);
      params.push(organizationId);
      paramIndex++;
    }
    if (zoneId) {
      conditions.push(`zah.zone_id = $${paramIndex}::uuid`);
      params.push(zoneId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `WITH current_hour AS (
          SELECT
            zone_id,
            organization_id,
            denied_count,
            door_anomaly_count
          FROM zone_analytics_hourly
          WHERE bucket >= date_trunc('hour', NOW())
          AND bucket < date_trunc('hour', NOW()) + INTERVAL '1 hour'
        ),
        baseline AS (
          SELECT
            zah.zone_id,
            AVG(zah.denied_count) AS mean_denied,
            STDDEV(zah.denied_count) AS stddev_denied,
            AVG(zah.door_anomaly_count) AS mean_anomaly,
            STDDEV(zah.door_anomaly_count) AS stddev_anomaly
          FROM zone_analytics_hourly zah
          WHERE zah.bucket >= NOW() - INTERVAL '7 days'
          AND EXTRACT(DOW FROM zah.bucket) = EXTRACT(DOW FROM NOW())
          AND EXTRACT(HOUR FROM zah.bucket) = EXTRACT(HOUR FROM NOW())
          GROUP BY zah.zone_id
        )
        SELECT
          ch.zone_id AS "zoneId",
          ch.organization_id AS "organizationId",
          'abnormal_activity' AS metric,
          COALESCE(ch.denied_count, 0) AS "currentValue",
          COALESCE(b.mean_denied, 0) AS "baselineMean",
          COALESCE(b.stddev_denied, 0) AS "baselineStdDev",
          CASE
            WHEN b.stddev_denied > 0 THEN (ch.denied_count - b.mean_denied) / b.stddev_denied
            ELSE 0
          END AS deviation
        FROM current_hour ch
        JOIN baseline b ON b.zone_id = ch.zone_id
        WHERE (
          (b.stddev_denied > 0 AND (ch.denied_count - b.mean_denied) / b.stddev_denied > $1)
          OR
          (b.stddev_anomaly > 0 AND (ch.door_anomaly_count - b.mean_anomaly) / b.stddev_anomaly > $1)
        )
        ${whereClause}
        ORDER BY deviation DESC
        LIMIT 20`,
        ...params,
      );

      return rows.map((row: any) => ({
        zoneId: row.zoneId,
        organizationId: row.organizationId,
        metric: row.metric,
        currentValue: Number(row.currentValue) || 0,
        baselineMean: Number(row.baselineMean) || 0,
        baselineStdDev: Number(row.baselineStdDev) || 0,
        deviation: Number(row.deviation) || 0,
        severity: (Number(row.deviation) > 3 ? 'HIGH' : Number(row.deviation) > 2 ? 'MEDIUM' : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
        detectedAt: new Date().toISOString(),
      })) as AbnormalActivityDto[];
    } catch (err: any) {
      this.logger.warn(`getAbnormalActivity query failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Delegate BASTION advanced search to BastionAnalyticsService.
   * Preserves backward compatibility with existing dashboard.
   */
  async bastionSearch(
    orgId: string,
    filters: AdvancedSearchFilters,
  ) {
    return this.bastionAnalytics.advancedSearch(orgId, filters);
  }

  async getAnalyticsTrends(
    organizationId: string,
    metric: string,
    granularity: 'hourly' | 'daily' = 'hourly',
  ): Promise<AnalyticsTrendPoint[]> {
    const table = granularity === 'daily' ? 'site_analytics_daily' : 'zone_analytics_hourly';
    const bucketExpr = granularity === 'daily' ? 'bucket' : 'bucket';

    // Map metric names to column expressions
    const metricMap: Record<string, string> = {
      denied_count: 'denied_count',
      granted_count: 'granted_count',
      door_anomaly_count: 'door_anomaly_count',
      unsecured_count: 'unsecured_count',
      total_denied: 'total_denied',
      total_granted: 'total_granted',
      doors_with_anomalies: 'doors_with_anomalies',
    };

    const column = metricMap[metric] || 'denied_count';

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          ${bucketExpr}::text AS "bucket",
          COALESCE(${column}, 0) AS "value",
          $1 AS "metric"
        FROM ${table}
        WHERE organization_id = $2::uuid
        ORDER BY ${bucketExpr} ASC
        LIMIT 200`,
        metric,
        organizationId,
      );

      return rows as unknown as AnalyticsTrendPoint[];
    } catch (err: any) {
      this.logger.warn(`getAnalyticsTrends query failed: ${err.message}`);
      return [];
    }
  }
}
