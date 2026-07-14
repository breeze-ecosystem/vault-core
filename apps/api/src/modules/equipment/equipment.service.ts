import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { EquipmentPredictor } from "./equipment.predictor";

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject("REDIS_EQUIPMENT") private readonly redis: Redis,
    private readonly predictor: EquipmentPredictor,
  ) {}

  /**
   * Camera health check — runs every 30 seconds.
   * Detects stale cameras (no heartbeat for 5 minutes), marks them OFFLINE,
   * writes to camera_health hypertable, and emits equipment.alert events.
   */
  @Cron("*/30 * * * * *")
  async checkCameraHealth() {
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);

    try {
      const staleCameras = await this.prisma.camera.findMany({
        where: {
          isRecording: true,
          OR: [
            { lastHeartbeat: null },
            { lastHeartbeat: { lt: staleThreshold } },
          ],
          status: { in: ["ONLINE", "DEGRADED"] as any },
        },
        include: { site: true },
      });

      for (const camera of staleCameras) {
        // Write to camera_health hypertable
        await this.prisma.$queryRawUnsafe(
          `INSERT INTO camera_health (time, camera_id, site_id, status, last_heartbeat)
           VALUES (NOW(), $1::uuid, $2::uuid, 'offline', $3::timestamptz)`,
          camera.id,
          camera.siteId,
          camera.lastHeartbeat?.toISOString() ?? null,
        );

        // Update Camera model status
        await this.prisma.camera.update({
          where: { id: camera.id },
          data: { status: "OFFLINE" as any },
        });

        // Emit alert with debounce
        const debounceKey = `equipment:debounce:camera:${camera.id}`;
        const alreadyDebounced = await this.checkDebounce(debounceKey);
        if (!alreadyDebounced) {
          this.eventEmitter.emit("equipment.alert", {
            deviceType: "camera",
            deviceId: camera.id,
            status: "offline",
            siteId: camera.siteId,
            timestamp: new Date().toISOString(),
          });
          await this.setDebounce(debounceKey, 60);
        }

        this.logger.warn(`Camera OFFLINE: ${camera.name} (${camera.id})`);
      }
    } catch (err: any) {
      this.logger.error(`Camera health check failed: ${err.message}`);
    }
  }

  /**
   * Reader health check — runs every 30 seconds.
   * Detects readers with no recent health event (10-minute threshold).
   */
  @Cron("*/30 * * * * *")
  async checkReaderHealth() {
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);

    try {
      const staleReaders = await this.prisma.$queryRawUnsafe<
        Array<{ reader_id: string; site_id: string; last_connected: Date | null }>
      >(
        `SELECT DISTINCT ON (reader_id) reader_id, site_id, last_connected
         FROM reader_health
         WHERE time > $1::timestamptz
         ORDER BY reader_id, time DESC`,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      );

      for (const reader of staleReaders) {
        if (reader.last_connected && reader.last_connected > staleThreshold) continue;

        await this.prisma.$queryRawUnsafe(
          `INSERT INTO reader_health (time, reader_id, site_id, status)
           VALUES (NOW(), $1::uuid, $2::uuid, 'offline')`,
          reader.reader_id,
          reader.site_id,
        );

        const debounceKey = `equipment:debounce:reader:${reader.reader_id}`;
        const alreadyDebounced = await this.checkDebounce(debounceKey);
        if (!alreadyDebounced) {
          this.eventEmitter.emit("equipment.alert", {
            deviceType: "reader",
            deviceId: reader.reader_id,
            status: "offline",
            siteId: reader.site_id,
            timestamp: new Date().toISOString(),
          });
          await this.setDebounce(debounceKey, 60);
        }
      }
    } catch (err: any) {
      this.logger.error(`Reader health check failed: ${err.message}`);
    }
  }

  /**
   * Handle MQTT controller health events — writes to controller_health hypertable.
   * Alerts on low battery (<20%) and unstable connection.
   */
  @OnEvent("mqtt.controller.health", { async: true })
  async handleControllerHealth(payload: { topic: string; message: any }) {
    const { topic, message } = payload;
    const topicParts = topic.split("/");
    const siteId = topicParts[1];
    const controllerId = topicParts[3];

    if (!siteId || !controllerId || !message) return;

    try {
      await this.prisma.$queryRawUnsafe(
        `INSERT INTO controller_health
         (time, controller_id, site_id, battery_level, connection_stability, firmware_version, cpu_load, memory_usage, metadata)
         VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb)`,
        controllerId,
        siteId,
        message.batteryLevel ?? null,
        message.connectionStability ?? null,
        message.firmwareVersion ?? null,
        message.cpuLoad ?? null,
        message.memoryUsage ?? null,
        JSON.stringify(message.metadata ?? {}),
      );

      // Alert on low battery
      if (message.batteryLevel !== undefined && message.batteryLevel < 20) {
        const debounceKey = `equipment:debounce:controller:${controllerId}:low-battery`;
        const alreadyDebounced = await this.checkDebounce(debounceKey);
        if (!alreadyDebounced) {
          this.eventEmitter.emit("equipment.alert", {
            deviceType: "controller",
            deviceId: controllerId,
            status: "low-battery",
            siteId,
            batteryLevel: message.batteryLevel,
            timestamp: new Date().toISOString(),
          });
          await this.setDebounce(debounceKey, 300);
        }
      }

      // Alert on unstable connection
      if (message.connectionStability && message.connectionStability !== "stable") {
        const debounceKey = `equipment:debounce:controller:${controllerId}:connection-issue`;
        const alreadyDebounced = await this.checkDebounce(debounceKey);
        if (!alreadyDebounced) {
          this.eventEmitter.emit("equipment.alert", {
            deviceType: "controller",
            deviceId: controllerId,
            status: "connection-issue",
            siteId,
            connectionStability: message.connectionStability,
            timestamp: new Date().toISOString(),
          });
          await this.setDebounce(debounceKey, 300);
        }
      }
    } catch (err: any) {
      this.logger.error(`Controller health handler failed: ${err.message}`);
    }
  }

  /**
   * Get camera health status list.
   */
  async getCameraHealth() {
    const cameras = await this.prisma.camera.findMany({
      include: { site: { select: { id: true, name: true } } },
    });

    return Promise.all(
      cameras.map(async (camera) => {
        const latest = await this.prisma.$queryRawUnsafe<
          Array<{ status: string; time: string }>
        >(
          `SELECT status, time FROM camera_health
           WHERE camera_id = $1::uuid AND time > NOW() - INTERVAL '24 hours'
           ORDER BY time DESC LIMIT 1`,
          camera.id,
        );

        return {
          id: camera.id,
          name: camera.name,
          status: camera.status,
          siteId: camera.siteId,
          siteName: (camera.site as any)?.name ?? null,
          lastHeartbeat: camera.lastHeartbeat?.toISOString() ?? null,
          isRecording: camera.isRecording,
          fps: camera.fps,
          latestHealth: latest[0] ?? null,
        };
      }),
    );
  }

  /**
   * Get camera health history for a specific camera.
   */
  async getCameraHealthHistory(cameraId: string, from?: string, to?: string) {
    const fromDate = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    return this.prisma.$queryRawUnsafe(
      `SELECT time, status, fps_actual, fps_expected, latency_ms
       FROM camera_health
       WHERE camera_id = $1::uuid AND time >= $2::timestamptz AND time <= $3::timestamptz
       ORDER BY time DESC`,
      cameraId,
      fromDate,
      toDate,
    );
  }

  /**
   * Get reader health status list.
   */
  async getReaderHealth() {
    return this.prisma.$queryRawUnsafe(
      `SELECT DISTINCT ON (reader_id) reader_id, site_id, status, failed_reads, response_time_ms,
              last_connected, firmware_version, time
       FROM reader_health
       WHERE time > NOW() - INTERVAL '24 hours'
       ORDER BY reader_id, time DESC`,
    );
  }

  /**
   * Get reader health history for a specific reader.
   */
  async getReaderHealthHistory(readerId: string, from?: string, to?: string) {
    const fromDate = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    return this.prisma.$queryRawUnsafe(
      `SELECT time, status, failed_reads, response_time_ms, last_connected
       FROM reader_health
       WHERE reader_id = $1::uuid AND time >= $2::timestamptz AND time <= $3::timestamptz
       ORDER BY time DESC`,
      readerId,
      fromDate,
      toDate,
    );
  }

  /**
   * Get controller health status list.
   */
  async getControllerHealth() {
    return this.prisma.$queryRawUnsafe(
      `SELECT DISTINCT ON (controller_id) controller_id, site_id, battery_level, connection_stability,
              firmware_version, cpu_load, memory_usage, time
       FROM controller_health
       WHERE time > NOW() - INTERVAL '24 hours'
       ORDER BY controller_id, time DESC`,
    );
  }

  /**
   * Get controller health history for a specific controller.
   */
  async getControllerHealthHistory(controllerId: string, from?: string, to?: string) {
    const fromDate = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    return this.prisma.$queryRawUnsafe(
      `SELECT time, battery_level, connection_stability, cpu_load, memory_usage
       FROM controller_health
       WHERE controller_id = $1::uuid AND time >= $2::timestamptz AND time <= $3::timestamptz
       ORDER BY time DESC`,
      controllerId,
      fromDate,
      toDate,
    );
  }

  /**
   * Check if a debounce key exists in Redis.
   */
  private async checkDebounce(key: string): Promise<boolean> {
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
  private async setDebounce(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, "1", "EX", ttlSeconds);
    } catch {
      // Redis not available — skip debounce
    }
  }

  // ──────────────────────────────────────────────
  // Predictive Health Methods (Plan 03-04)
  // ──────────────────────────────────────────────

  /**
   * Hourly cron — computes predictions for all devices.
   */
  @Cron("0 * * * *")
  async computePredictions(): Promise<void> {
    try {
      await this.predictor.computeAllPredictions();
      this.logger.log("Predictive health cycle complete");
    } catch (err: any) {
      this.logger.error(`Predictive health cycle failed: ${err.message}`);
    }
  }

  /**
   * Get predictions with optional filters.
   */
  async getPredictions(params?: {
    siteId?: string;
    deviceType?: string;
    metric?: string;
    triggeredAlert?: boolean;
  }): Promise<any[]> {
    let query = `
      SELECT p.time, p.site_id, p.device_type, p.device_id, p.metric,
             p.current_value, p.failure_threshold, p.slope,
             p.hours_to_failure, p.confidence, p.data_points, p.triggered_alert,
             p.time AS id
    `;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params?.siteId) {
      conditions.push(`p.site_id = $${paramIndex}::uuid`);
      values.push(params.siteId);
      paramIndex++;
    }
    if (params?.deviceType) {
      conditions.push(`p.device_type = $${paramIndex}`);
      values.push(params.deviceType);
      paramIndex++;
    }
    if (params?.metric) {
      conditions.push(`p.metric = $${paramIndex}`);
      values.push(params.metric);
      paramIndex++;
    }
    if (params?.triggeredAlert !== undefined) {
      conditions.push(`p.triggered_alert = $${paramIndex}`);
      values.push(params.triggeredAlert);
      paramIndex++;
    }

    // Join with device tables to get device name
    query += `, COALESCE(c.name, r.name, ctrl.name) AS device_name
      FROM predictions p
      LEFT JOIN "Camera" c ON p.device_type = 'camera' AND p.device_id = c.id
      LEFT JOIN "Door" r ON p.device_type = 'reader' AND p.device_id = r.id
      LEFT JOIN "Controller" ctrl ON p.device_type = 'controller' AND p.device_id = ctrl.id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY p.time DESC LIMIT 200";

    const rows = await this.prisma.$queryRawUnsafe<any[]>(query, ...values);

    return rows.map((row: any) => ({
      id: row.id,
      time: row.time?.toISOString?.() ?? row.time,
      siteId: row.site_id,
      deviceType: row.device_type,
      deviceId: row.device_id,
      deviceName: row.device_name ?? null,
      metric: row.metric,
      currentValue: row.current_value,
      failureThreshold: row.failure_threshold,
      slope: row.slope,
      hoursToFailure: row.hours_to_failure,
      confidence: row.confidence,
      dataPoints: row.data_points,
      triggeredAlert: row.triggered_alert,
    }));
  }

  /**
   * Get camera-to-door associations with status (orphans, mismatches).
   */
  async getCameraDoorAssociations(siteId?: string): Promise<any[]> {
    const associations: any[] = [];

    // Get all CameraDoorMap entries with camera and door details
    const siteFilter = siteId
      ? `AND c.site_id = $1::uuid AND d.site_id = $1::uuid`
      : "";

    // Mapped associations
    const mapped = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         c.id AS camera_id, c.name AS camera_name,
         d.id AS door_id, d.name AS door_name,
         d.zone_id AS door_zone_id,
         cdm.angle, cdm.priority,
         CASE
           WHEN c.site_id != d.site_id THEN 'zone_mismatch'
           ELSE 'mapped'
         END AS status
       FROM "CameraDoorMap" cdm
       JOIN "Camera" c ON cdm.camera_id = c.id
       JOIN "Door" d ON cdm.door_id = d.id
       WHERE 1=1 ${siteFilter}
       ORDER BY c.name`,
      ...(siteId ? [siteId] : []),
    );
    associations.push(...mapped);

    // Orphan cameras — cameras with no CameraDoorMap entry
    const orphanCameras = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT c.id AS camera_id, c.name AS camera_name,
              NULL AS door_id, NULL AS door_name, NULL AS door_zone_id,
              NULL AS angle, 0 AS priority,
              'orphan_camera' AS status
       FROM "Camera" c
       WHERE c.id NOT IN (SELECT camera_id FROM "CameraDoorMap")
       ${siteId ? `AND c.site_id = $1::uuid` : ""}
       ORDER BY c.name`,
      ...(siteId ? [siteId] : []),
    );
    associations.push(...orphanCameras);

    // Orphan doors — doors with no CameraDoorMap entry
    const orphanDoors = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT NULL AS camera_id, NULL AS camera_name,
              d.id AS door_id, d.name AS door_name,
              d.zone_id AS door_zone_id, NULL AS angle, 0 AS priority,
              'orphan_door' AS status
       FROM "Door" d
       WHERE d.id NOT IN (SELECT door_id FROM "CameraDoorMap")
       ${siteId ? `AND d.site_id = $1::uuid` : ""}
       ORDER BY d.name`,
      ...(siteId ? [siteId] : []),
    );
    associations.push(...orphanDoors);

    return associations;
  }

  /**
   * Get predictive health summary stats for dashboard.
   */
  async getPredictiveHealthSummary(siteId?: string): Promise<{
    totalPredictions: number;
    criticalPredictions: number;
    byDeviceType: { camera: number; reader: number; controller: number };
  }> {
    const siteFilter = siteId ? `WHERE site_id = $1::uuid` : "";

    const total = await this.prisma.$queryRawUnsafe<
      Array<{ total: bigint }>
    >(
      `SELECT COUNT(*) AS total FROM predictions ${siteFilter}`,
      ...(siteId ? [siteId] : []),
    );

    const critical = await this.prisma.$queryRawUnsafe<
      Array<{ total: bigint }>
    >(
      `SELECT COUNT(*) AS total FROM predictions
       WHERE hours_to_failure IS NOT NULL AND hours_to_failure <= 72
       ${siteId ? "AND site_id = $1::uuid" : ""}`,
      ...(siteId ? [siteId] : []),
    );

    const byDevice = await this.prisma.$queryRawUnsafe<
      Array<{ device_type: string; count: bigint }>
    >(
      `SELECT device_type, COUNT(*) AS count FROM predictions
       ${siteFilter}
       GROUP BY device_type`,
      ...(siteId ? [siteId] : []),
    );

    const byDeviceType: { camera: number; reader: number; controller: number } = {
      camera: 0,
      reader: 0,
      controller: 0,
    };
    for (const row of byDevice) {
      if (row.device_type === "camera") byDeviceType.camera = Number(row.count);
      else if (row.device_type === "reader") byDeviceType.reader = Number(row.count);
      else if (row.device_type === "controller") byDeviceType.controller = Number(row.count);
    }

    return {
      totalPredictions: Number(total[0]?.total ?? 0),
      criticalPredictions: Number(critical[0]?.total ?? 0),
      byDeviceType,
    };
  }
}
