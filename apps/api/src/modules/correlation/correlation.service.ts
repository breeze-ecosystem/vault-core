import { Injectable, Logger } from "@nestjs/common";
import { OnEvent, EventEmitter2 } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import type {
  TimelineEntry,
  PaginatedTimelineResponse,
  CorrelationJob,
} from "@repo/shared";

interface AccessEventPayload {
  credentialId: string;
  userId: string;
  doorId: string;
  zoneId: string;
  orgId: string;
  reason?: string;
  timestamp: Date;
}

interface DoorStateEvent {
  doorId: string;
  orgId: string;
  zoneId: string;
  previousState: string;
  newState: string;
  timestamp: Date;
}

/**
 * CorrelationService — D-13, D-15, VEC-02, VEC-05.
 * Listens for access/door events and triggers async video correlation.
 * Provides unified timeline queries via TimescaleDB hypertables.
 */
@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @InjectQueue("video-correlation") private correlationQueue: Queue,
    @InjectQueue("tailgating-detection") private tailgatingQueue: Queue,
  ) {}

  // ── Event Handlers (D-13: async, never blocks access decision) ──

  @OnEvent("access.granted", { async: true })
  async onAccessGranted(payload: AccessEventPayload): Promise<void> {
    try {
      await this.correlationQueue.add("correlate-video", {
        eventType: "access.granted",
        doorId: payload.doorId,
        orgId: payload.orgId,
        credentialId: payload.credentialId,
        userId: payload.userId,
        timestamp: payload.timestamp,
      });

      // D-20: Enqueue tailgating detection with 3s delay
      await this.tailgatingQueue.add("detect-tailgating", {
        doorId: payload.doorId,
        orgId: payload.orgId,
        eventTimestamp: payload.timestamp,
        accessEventId: "",
      }, {
        delay: 3000,
        attempts: 1,
        removeOnComplete: true,
      });

      this.logger.debug(
        `Correlation + tailgating jobs enqueued for door=${payload.doorId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to enqueue correlation jobs: ${err.message}`,
      );
    }
  }

  @OnEvent("access.denied", { async: true })
  async onAccessDenied(payload: AccessEventPayload): Promise<void> {
    try {
      await this.correlationQueue.add("correlate-video", {
        eventType: "access.denied",
        doorId: payload.doorId,
        orgId: payload.orgId,
        credentialId: payload.credentialId,
        reason: payload.reason,
        timestamp: payload.timestamp,
      });

      this.logger.debug(
        `Correlation job enqueued for denied access at door=${payload.doorId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to enqueue correlation job for denied access: ${err.message}`,
      );
    }
  }

  @OnEvent("door.state-changed", { async: true })
  async onDoorStateChanged(payload: DoorStateEvent): Promise<void> {
    // Door state changes appear in the timeline (VEC-02).
    // The TimescaleDB insertion already happened in DoorService.
    // Emit for real-time timeline updates via Socket.IO gateway.
    this.eventEmitter.emit("timeline.new-event", {
      type: "door-state",
      doorId: payload.doorId,
      orgId: payload.orgId,
      zoneId: payload.zoneId,
      state: payload.newState,
      previousState: payload.previousState,
      timestamp: payload.timestamp,
    });
  }

  // ── Timeline Queries (D-15, VEC-02, VEC-05) ──

  /**
   * VEC-05: Search events by multiple filters.
   * Queries TimescaleDB access_events hypertable via $queryRaw.
   */
  async searchEvents(params: {
    orgId: string;
    from?: string;
    to?: string;
    credentialId?: string;
    userId?: string;
    doorId?: string;
    zoneId?: string;
    decision?: "granted" | "denied";
    page?: number;
    limit?: number;
  }): Promise<PaginatedTimelineResponse> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    try {
      // Build WHERE clauses dynamically
      const conditions: string[] = ["ae.organization_id = $1::uuid"];
      const values: any[] = [params.orgId];
      let idx = 2;

      if (params.from) {
        conditions.push(`ae.time >= $${idx}::timestamptz`);
        values.push(new Date(params.from));
        idx++;
      }
      if (params.to) {
        conditions.push(`ae.time <= $${idx}::timestamptz`);
        values.push(new Date(params.to));
        idx++;
      }
      if (params.credentialId) {
        conditions.push(`ae.credential_id = $${idx}::uuid`);
        values.push(params.credentialId);
        idx++;
      }
      if (params.userId) {
        conditions.push(`ae.user_id = $${idx}::uuid`);
        values.push(params.userId);
        idx++;
      }
      if (params.doorId) {
        conditions.push(`ae.door_id = $${idx}::uuid`);
        values.push(params.doorId);
        idx++;
      }
      if (params.decision) {
        conditions.push(`ae.decision = $${idx}::text`);
        values.push(params.decision);
        idx++;
      }
      if (params.zoneId) {
        // Filter by doors in the zone using a subquery
        conditions.push(
          `ae.door_id IN (SELECT id FROM "Door" WHERE zone_id = $${idx}::uuid)`,
        );
        values.push(params.zoneId);
        idx++;
      }

      const whereClause = conditions.length > 0
        ? "WHERE " + conditions.join(" AND ")
        : "";

      // Count query
      const countQuery = `SELECT COUNT(*) as total FROM access_events ae ${whereClause}`;
      const countResult = await this.prisma.$queryRawUnsafe<Array<{ total: number }>>(countQuery, ...values);
      const total = Number(countResult?.[0]?.total ?? 0);

      // Data query with LIMIT/OFFSET
      const dataQuery = `
        SELECT
          ae.id as "eventId",
          'access' as "eventType",
          ae.time as "timestamp",
          ae.door_id as "doorId",
          ae.decision::text as "decision",
          COALESCE(ae.metadata->>'credential_id', '') as "credentialId",
          COALESCE(ae.metadata->>'user_id', '') as "userId",
          ae.metadata as "metadata"
        FROM access_events ae
        ${whereClause}
        ORDER BY ae.time DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;

      const dataValues = [...values, limit, offset];
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          eventId: string;
          eventType: string;
          timestamp: Date;
          doorId: string;
          decision: string;
          credentialId: string;
          userId: string;
          metadata: any;
        }>
      >(dataQuery, ...dataValues);

      // Enrich with door names from Prisma
      const doorIds = [...new Set(rows.map((r) => r.doorId))];
      const doors = await this.prisma.door.findMany({
        where: { id: { in: doorIds } },
        select: { id: true, name: true, zoneId: true },
      });
      const doorMap = new Map(doors.map((d) => [d.id, d]));

      const data: TimelineEntry[] = rows.map((row) => {
        const door = doorMap.get(row.doorId);
        const meta = row.metadata || {};
        const correlation = meta?.correlation || {};
        const summary =
          row.decision === "granted" ? "Accès accordé" : "Accès refusé";

        return {
          eventId: row.eventId,
          eventType: "access",
          timestamp: row.timestamp.toISOString(),
          doorId: row.doorId,
          doorName: door?.name,
          zoneId: door?.zoneId,
          summary,
          detail:
            row.decision === "denied"
              ? `Refusé — ${meta?.reason ?? "inconnu"}`
              : undefined,
          videoThumbnailUrl: correlation?.thumbnailUrl,
          snapshotUrl: correlation?.snapshotUrl,
          metadata: meta,
        };
      });

      return { data, total, page, limit };
    } catch (err: any) {
      this.logger.warn(
        `access_events query failed (hypertable may not exist): ${err.message}`,
      );
      return { data: [], total: 0, page, limit };
    }
  }

  /**
   * VEC-02, D-15: Get unified timeline for a site.
   * Read-time UNION ALL merge of access_events + door_state_log.
   */
  async getUnifiedTimeline(
    orgId: string,
    params: { from?: string; to?: string; limit?: number },
  ): Promise<TimelineEntry[]> {
    const limit = params.limit ?? 100;

    try {
      const fromCondition = params.from
        ? `AND time >= '${new Date(params.from).toISOString()}'::timestamptz`
        : "";
      const toCondition = params.to
        ? `AND time <= '${new Date(params.to).toISOString()}'::timestamptz`
        : "";

      const query = `
        SELECT * FROM (
          SELECT
            id::text as "eventId",
            'access' as "eventType",
            time as "timestamp",
            door_id::text as "doorId",
            organization_id::text as "orgId",
            'access' as "category",
            decision::text as "summary",
            metadata::jsonb as "metadata"
          FROM access_events
          WHERE organization_id = $1::uuid ${fromCondition} ${toCondition}
          UNION ALL
          SELECT
            '' as "eventId",
            'door' as "eventType",
            time as "timestamp",
            door_id::text as "doorId",
            organization_id::text as "orgId",
            state as "category",
            state as "summary",
            '{}'::jsonb as "metadata"
          FROM door_state_log
          WHERE organization_id = $1::uuid ${fromCondition} ${toCondition}
        ) combined
        ORDER BY time DESC
        LIMIT $2
      `;

      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          eventId: string;
          eventType: string;
          timestamp: Date;
          doorId: string;
          orgId: string;
          summary: string;
          category: string;
          metadata: any;
        }>
      >(query, orgId, limit);

      // Enrich with door names
      const doorIds = [...new Set(rows.map((r) => r.doorId))];
      const doors = await this.prisma.door.findMany({
        where: { id: { in: doorIds } },
        select: { id: true, name: true, zoneId: true },
      });
      const doorMap = new Map(doors.map((d) => [d.id, d]));

      return rows.map((row) => {
        const door = doorMap.get(row.doorId);
        const meta = row.metadata || {};
        const correlation = meta?.correlation || {};

        return {
          eventId: row.eventId || `door-${row.timestamp.toISOString()}-${row.doorId}`,
          eventType: row.eventType as "access" | "door",
          timestamp: row.timestamp.toISOString(),
          doorId: row.doorId,
          doorName: door?.name,
          zoneId: door?.zoneId,
          summary: row.eventType === "access"
            ? (row.summary === "granted" ? "Accès accordé" : "Accès refusé")
            : `État porte: ${row.summary}`,
          detail: row.eventType === "access" ? undefined : row.summary,
          videoThumbnailUrl: correlation?.thumbnailUrl,
          snapshotUrl: correlation?.snapshotUrl,
          metadata: meta,
        };
      });
    } catch (err: any) {
      this.logger.warn(
        `Unified timeline query failed (hypertables may not exist): ${err.message}`,
      );
      return [];
    }
  }

  /**
   * VEC-03: Get video correlation data for a specific event.
   */
  async getEventVideo(eventId: string): Promise<{
    cameraId: string;
    snapshotUrl?: string;
    thumbnailUrl?: string;
    timestamp: string;
  }> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          metadata: any;
          time: Date;
        }>
      >(
        `SELECT metadata, time FROM access_events WHERE id::text = $1 LIMIT 1`,
        eventId,
      );

      if (!rows.length) {
        return { cameraId: "", timestamp: new Date().toISOString() };
      }

      const meta = rows[0].metadata || {};
      const correlation = meta?.correlation || {};

      return {
        cameraId: correlation?.cameraId ?? "",
        snapshotUrl: correlation?.snapshotUrl,
        thumbnailUrl: correlation?.thumbnailUrl,
        timestamp: rows[0].time.toISOString(),
      };
    } catch (err: any) {
      this.logger.warn(
        `Event video query failed: ${err.message}`,
      );
      return { cameraId: "", timestamp: new Date().toISOString() };
    }
  }
}
