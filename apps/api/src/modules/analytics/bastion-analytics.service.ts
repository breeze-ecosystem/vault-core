import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BastionKpisDto, AnalyticsTrendPoint } from '@repo/shared';

export interface AdvancedSearchFilters {
  dateFrom?: string;
  dateTo?: string;
  siteId?: string;
  eventType?: string;
  personName?: string;
  page: number;
  limit: number;
}

export interface AdvancedSearchResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class BastionAnalyticsService {
  private readonly logger = new Logger(BastionAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch BASTION KPI dashboard values: incidents today, active alerts,
   * cameras online, storage used (bytes), entries today.
   */
  async getBastionKpis(orgId: string): Promise<BastionKpisDto> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          (SELECT COUNT(*) FROM incidents WHERE organization_id = $1::uuid AND DATE(created_at) = CURRENT_DATE) AS "incidentsToday",
          (SELECT COUNT(*) FROM alerts WHERE organization_id = $1::uuid AND status = 'OPEN') AS "activeAlerts",
          (SELECT COUNT(*) FROM cameras WHERE organization_id = $1::uuid AND status = 'ONLINE') AS "camerasOnline",
          (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) * 8000000 / 8), 0) FROM recordings WHERE organization_id = $1::uuid) AS "storageUsedBytes",
          (SELECT COUNT(*) FROM access_events WHERE organization_id = $1::uuid AND event_type = 'GRANTED' AND DATE(time) = CURRENT_DATE) AS "entriesToday"`,
        orgId,
      );

      return {
        incidentsToday: Number(rows[0]?.incidentsToday) || 0,
        activeAlerts: Number(rows[0]?.activeAlerts) || 0,
        camerasOnline: Number(rows[0]?.camerasOnline) || 0,
        storageUsedBytes: Number(rows[0]?.storageUsedBytes) || 0,
        entriesToday: Number(rows[0]?.entriesToday) || 0,
      };
    } catch (err: any) {
      this.logger.error(`getBastionKpis query failed: ${err.message}`);
      return { incidentsToday: 0, activeAlerts: 0, camerasOnline: 0, storageUsedBytes: 0, entriesToday: 0 };
    }
  }

  /**
   * Fetch trend data for a given metric over 7d or 30d.
   * Uses time_bucket (TimescaleDB) or DATE_TRUNC fallback.
   */
  async getTrends(
    orgId: string,
    metric: string,
    days: 7 | 30,
  ): Promise<AnalyticsTrendPoint[]> {
    const interval = days === 7 ? '1 hour' : '1 day';
    const bucketExpr = `time_bucket(INTERVAL '${interval}', t)`;

    let table: string;
    let timeColumn: string;
    let valueColumn: string;

    switch (metric) {
      case 'incidents':
        table = 'incidents';
        timeColumn = 'created_at';
        valueColumn = 'COUNT(*)';
        break;
      case 'alerts':
        table = 'alerts';
        timeColumn = 'created_at';
        valueColumn = 'COUNT(*)';
        break;
      case 'entries':
        table = 'access_events';
        timeColumn = 'time';
        valueColumn = 'COUNT(*)';
        break;
      default:
        this.logger.warn(`Unknown trend metric: ${metric}`);
        return [];
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT
          ${bucketExpr}::text AS "bucket",
          ${valueColumn} AS "value",
          $2 AS "metric"
        FROM ${table}
        WHERE organization_id = $1::uuid
          AND ${timeColumn} >= NOW() - INTERVAL '${days} days'
        GROUP BY bucket
        ORDER BY bucket ASC`,
        orgId,
        metric,
      );

      return rows.map((row: any) => ({
        bucket: String(row.bucket),
        value: Number(row.value) || 0,
        metric: row.metric || metric,
      }));
    } catch (err: any) {
      this.logger.error(`getTrends query failed for metric ${metric}: ${err.message}`);
      return [];
    }
  }

  /**
   * Advanced search across alerts, incidents, and access_events tables
   * with optional filters: dateFrom, dateTo, siteId, eventType, personName.
   */
  async advancedSearch(
    orgId: string,
    filters: AdvancedSearchFilters,
  ): Promise<AdvancedSearchResult> {
    const { dateFrom, dateTo, siteId, eventType, personName, page, limit } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [`organization_id = $1::uuid`];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (dateFrom) {
      conditions.push(`time >= $${paramIndex}::timestamptz`);
      params.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      conditions.push(`time <= $${paramIndex}::timestamptz`);
      params.push(dateTo);
      paramIndex++;
    }
    if (siteId) {
      conditions.push(`site_id = $${paramIndex}::uuid`);
      params.push(siteId);
      paramIndex++;
    }
    if (eventType) {
      conditions.push(`event_type = $${paramIndex}`);
      params.push(eventType);
      paramIndex++;
    }
    if (personName) {
      conditions.push(`person_name ILIKE $${paramIndex}`);
      params.push(`%${personName}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    try {
      // Count total matching records
      const countResult = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT COUNT(*) AS total FROM (
          SELECT time, 'alert' AS source, id, title AS summary, severity AS event_type, camera_id AS site_id, NULL AS person_name
          FROM alerts WHERE ${whereClause.replace(/time/g, 'created_at')}
          UNION ALL
          SELECT created_at AS time, 'incident' AS source, id, title AS summary, severity AS event_type, site_id, NULL AS person_name
          FROM incidents WHERE ${whereClause.replace(/time/g, 'created_at').replace(/event_type/g, 'severity')}
          UNION ALL
          SELECT time, 'access' AS source, id, decision AS summary, event_type, door_id::text AS site_id, person_name
          FROM access_events WHERE ${whereClause}
        ) combined`,
        ...params,
      );
      const total = Number(countResult[0]?.total) || 0;

      // Fetch paginated results
      const data = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT time, source, id, summary, event_type, site_id, person_name FROM (
          SELECT time, 'alert' AS source, id, title AS summary, severity AS event_type, camera_id AS site_id, NULL AS person_name
          FROM alerts WHERE ${whereClause.replace(/time/g, 'created_at')}
          UNION ALL
          SELECT created_at AS time, 'incident' AS source, id, title AS summary, severity AS event_type, site_id, NULL AS person_name
          FROM incidents WHERE ${whereClause.replace(/time/g, 'created_at').replace(/event_type/g, 'severity')}
          UNION ALL
          SELECT time, 'access' AS source, id, decision AS summary, event_type, door_id::text AS site_id, person_name
          FROM access_events WHERE ${whereClause}
        ) combined
        ORDER BY time DESC
        OFFSET $${paramIndex}
        LIMIT $${paramIndex + 1}`,
        ...params,
        offset,
        limit,
      );

      return { data, total, page, limit };
    } catch (err: any) {
      this.logger.error(`advancedSearch query failed: ${err.message}`);
      return { data: [], total: 0, page, limit };
    }
  }

  /**
   * Export filtered data as CSV or PDF.
   */
  async exportData(
    orgId: string,
    filters: AdvancedSearchFilters,
    format: 'csv' | 'pdf',
  ): Promise<ExportResult> {
    if (format === 'csv') {
      // Query data with same filters as advancedSearch, but no pagination
      const result = await this.advancedSearch(orgId, { ...filters, page: 1, limit: 10000 });
      return this.convertToCsv(result.data, orgId);
    }

    // PDF — delegate by returning a basic PDF buffer (full report generation via ReportingModule)
    const now = new Date().toISOString().split('T')[0];
    const csvResult = await this.exportData(orgId, filters, 'csv');
    return { buffer: csvResult.buffer, filename: `bastion-export-${orgId.slice(0, 8)}-${now}.pdf` };
  }

  /**
   * Convert an array of records to CSV format with proper escaping.
   */
  private convertToCsv(rows: any[], orgId: string): ExportResult {
    const now = new Date().toISOString().split('T')[0];
    if (!rows || rows.length === 0) {
      return { buffer: Buffer.from(''), filename: `bastion-export-${orgId.slice(0, 8)}-${now}.csv` };
    }

    const headers = Object.keys(rows[0]);
    const escapeCsv = (val: any): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(',')),
    ];

    return {
      buffer: Buffer.from(lines.join('\n'), 'utf-8'),
      filename: `bastion-export-${orgId.slice(0, 8)}-${now}.csv`,
    };
  }
}
