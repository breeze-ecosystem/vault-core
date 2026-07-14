import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";

interface TrendReading {
  time: Date;
  value: number;
}

export interface TrendResult {
  slope: number;
  currentValue: number;
  failureThreshold: number;
  hoursToFailure: number | null;
  confidence: "high" | "medium" | "low";
  dataPoints: number;
}

@Injectable()
export class EquipmentPredictor {
  private readonly logger = new Logger(EquipmentPredictor.name);

  // Minimum data points required for a prediction
  private readonly MIN_DATA_POINTS = 10;
  // Minimum trend duration in days before alerting
  private readonly MIN_TREND_DAYS = 3;
  // Failure thresholds
  private readonly THRESHOLDS = {
    batteryLevel: 5,     // 5% = failure
    fpsRatio: 0.3,       // 30% of expected FPS = failure
    latencyMs: 5000,     // 5000ms = failure
    failedReads: 50,     // 50 failed reads per hour = failure
  };

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Simple linear regression trend analysis.
   * Computes slope (rate of change per reading), normalizes to per-hour.
   * Returns null if insufficient data or no degradation detected.
   */
  private predictTrend(
    readings: { time: Date; value: number }[],
    metric: string,
    failureThreshold: number,
  ): TrendResult | null {
    if (readings.length < this.MIN_DATA_POINTS) {
      return null;
    }

    // Calculate time span in hours
    const sorted = [...readings].sort((a, b) => a.time.getTime() - b.time.getTime());
    const firstTime = sorted[0].time.getTime();
    const lastTime = sorted[sorted.length - 1].time.getTime();
    const spanHours = (lastTime - firstTime) / (1000 * 60 * 60);

    // Must have at least MIN_TREND_DAYS of data
    if (spanHours < this.MIN_TREND_DAYS * 24) {
      return null;
    }

    // Linear regression: y = mx + b
    // x = time in hours since first reading, y = value
    const n = sorted.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (const reading of sorted) {
      const x = (reading.time.getTime() - firstTime) / (1000 * 60 * 60); // hours since start
      const y = reading.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    // Slope (m) = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Current value = most recent reading
    const currentValue = sorted[sorted.length - 1].value;

    // If not degrading toward threshold, return null
    const isDegrading =
      metric === "failed_reads"
        ? slope > 0 && currentValue < failureThreshold // trending UP (worse)
        : slope < 0 && currentValue > failureThreshold; // trending DOWN (worse)

    if (!isDegrading) {
      return null;
    }

    // Calculate hours-to-failure
    // For metrics where higher is worse (failed_reads): hours = (threshold - current) / slope
    // For metrics where lower is worse (battery, fps): hours = (current - threshold) / |slope|
    let hoursToFailure: number | null = null;
    if (slope !== 0) {
      if (metric === "failed_reads") {
        hoursToFailure = Math.round((failureThreshold - currentValue) / slope);
      } else {
        hoursToFailure = Math.round((currentValue - failureThreshold) / Math.abs(slope));
      }
      if (hoursToFailure < 0) hoursToFailure = null; // already past threshold
    }

    // Confidence based on data point count
    let confidence: "high" | "medium" | "low" = "low";
    if (n > 50) confidence = "high";
    else if (n > 20) confidence = "medium";

    return {
      slope,
      currentValue,
      failureThreshold,
      hoursToFailure,
      confidence,
      dataPoints: n,
    };
  }

  /**
   * Predict controller battery failure based on last 7 days of battery_level readings.
   */
  async predictControllerBatteryFailure(
    controllerId: string,
    siteId: string,
  ): Promise<TrendResult | null> {
    const readings = await this.prisma.$queryRawUnsafe<
      Array<{ time: Date; battery_level: number }>
    >(
      `SELECT time, battery_level
       FROM controller_health
       WHERE controller_id = $1::uuid AND time > NOW() - INTERVAL '7 days'
         AND battery_level IS NOT NULL
       ORDER BY time ASC`,
      controllerId,
    );

    if (!readings || readings.length === 0) return null;

    return this.predictTrend(
      readings.map((r) => ({ time: r.time, value: r.battery_level })),
      "battery_level",
      this.THRESHOLDS.batteryLevel,
    );
  }

  /**
   * Predict camera FPS failure based on last 7 days of fps_actual/fps_expected ratio.
   */
  async predictCameraFpsFailure(
    cameraId: string,
    siteId: string,
  ): Promise<TrendResult | null> {
    const readings = await this.prisma.$queryRawUnsafe<
      Array<{ time: Date; fps_actual: number | null; fps_expected: number | null }>
    >(
      `SELECT time, fps_actual, fps_expected
       FROM camera_health
       WHERE camera_id = $1::uuid AND time > NOW() - INTERVAL '7 days'
         AND fps_actual IS NOT NULL AND fps_expected IS NOT NULL
       ORDER BY time ASC`,
      cameraId,
    );

    if (!readings || readings.length === 0) return null;

    const ratioReadings = readings
      .filter((r): r is { time: Date; fps_actual: number; fps_expected: number } =>
        r.fps_expected !== null && r.fps_expected > 0 && r.fps_actual !== null,
      )
      .map((r) => ({
        time: r.time,
        value: r.fps_actual / r.fps_expected,
      }));

    if (ratioReadings.length < this.MIN_DATA_POINTS) return null;

    return this.predictTrend(ratioReadings, "fps_ratio", this.THRESHOLDS.fpsRatio);
  }

  /**
   * Predict reader failure based on last 7 days of failed_reads (trending UP is bad).
   */
  async predictReaderFailure(
    readerId: string,
    siteId: string,
  ): Promise<TrendResult | null> {
    const readings = await this.prisma.$queryRawUnsafe<
      Array<{ time: Date; failed_reads: number | null }>
    >(
      `SELECT time, failed_reads
       FROM reader_health
       WHERE reader_id = $1::uuid AND time > NOW() - INTERVAL '7 days'
         AND failed_reads IS NOT NULL
       ORDER BY time ASC`,
      readerId,
    );

    if (!readings || readings.length === 0) return null;

    return this.predictTrend(
      readings.map((r) => ({ time: r.time, value: r.failed_reads! })),
      "failed_reads",
      this.THRESHOLDS.failedReads,
    );
  }

  /**
   * Compute all predictions for active cameras, readers, and controllers.
   * Called by cron via EquipmentService.
   */
  async computeAllPredictions(): Promise<void> {
    const results: { deviceType: string; deviceId: string; metric: string; result: TrendResult | null }[] = [];

    // --- Controllers: battery failure ---
    const controllers = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; site_id: string }>
    >(
      `SELECT DISTINCT ON (controller_id) controller_id AS id, site_id
       FROM controller_health
       WHERE time > NOW() - INTERVAL '7 days'
       ORDER BY controller_id, time DESC`,
    );

    for (const controller of controllers) {
      const result = await this.predictControllerBatteryFailure(controller.id, controller.site_id);
      results.push({ deviceType: "controller", deviceId: controller.id, metric: "battery_level", result });
    }

    // --- Cameras: FPS failure ---
    const cameras = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; site_id: string }>
    >(
      `SELECT DISTINCT ON (camera_id) camera_id AS id, site_id
       FROM camera_health
       WHERE time > NOW() - INTERVAL '7 days'
       ORDER BY camera_id, time DESC`,
    );

    for (const camera of cameras) {
      const result = await this.predictCameraFpsFailure(camera.id, camera.site_id);
      results.push({ deviceType: "camera", deviceId: camera.id, metric: "fps_ratio", result });
    }

    // --- Readers: failed reads ---
    const readers = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; site_id: string }>
    >(
      `SELECT DISTINCT ON (reader_id) reader_id AS id, site_id
       FROM reader_health
       WHERE time > NOW() - INTERVAL '7 days'
       ORDER BY reader_id, time DESC`,
    );

    for (const reader of readers) {
      const result = await this.predictReaderFailure(reader.id, reader.site_id);
      results.push({ deviceType: "reader", deviceId: reader.id, metric: "failed_reads", result });
    }

    // Write predictions to hypertable and emit alerts
    let failureCount = 0;
    for (const { deviceType, deviceId, metric, result } of results) {
      if (!result) continue;

      const siteId = await this.getSiteIdForDevice(deviceType, deviceId);

      await this.prisma.$queryRawUnsafe(
        `INSERT INTO predictions
         (time, site_id, device_type, device_id, metric, current_value, failure_threshold,
          slope, hours_to_failure, confidence, data_points, triggered_alert)
         VALUES (NOW(), $1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11)`,
        siteId,
        deviceType,
        deviceId,
        metric,
        result.currentValue,
        result.failureThreshold,
        result.slope,
        result.hoursToFailure,
        result.confidence,
        result.dataPoints,
        result.hoursToFailure !== null && result.hoursToFailure <= 72,
      );

      if (result.hoursToFailure !== null && result.hoursToFailure <= 72) {
        failureCount++;
        this.eventEmitter.emit("prediction.triggered", {
          deviceType,
          deviceId,
          metric,
          hoursToFailure: result.hoursToFailure,
          confidence: result.confidence,
          siteId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.logger.log(
      `Predictions computed for ${results.length} devices, ${failureCount} failures predicted`,
    );
  }

  /**
   * Resolve site_id for a given device type and ID from its health hypertable.
   */
  private async getSiteIdForDevice(deviceType: string, deviceId: string): Promise<string> {
    if (deviceType === "controller") {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ site_id: string }>
      >(
        `SELECT site_id FROM controller_health
         WHERE controller_id = $1::uuid ORDER BY time DESC LIMIT 1`,
        deviceId,
      );
      return rows[0]?.site_id ?? "00000000-0000-0000-0000-000000000000";
    }
    if (deviceType === "camera") {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ site_id: string }>
      >(
        `SELECT site_id FROM camera_health
         WHERE camera_id = $1::uuid ORDER BY time DESC LIMIT 1`,
        deviceId,
      );
      return rows[0]?.site_id ?? "00000000-0000-0000-0000-000000000000";
    }
    if (deviceType === "reader") {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ site_id: string }>
      >(
        `SELECT site_id FROM reader_health
         WHERE reader_id = $1::uuid ORDER BY time DESC LIMIT 1`,
        deviceId,
      );
      return rows[0]?.site_id ?? "00000000-0000-0000-0000-000000000000";
    }
    return "00000000-0000-0000-0000-000000000000";
  }
}
