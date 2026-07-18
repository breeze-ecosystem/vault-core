import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface ActiveRecording {
  process: ChildProcess;
  cameraId: string;
  codec: string;
  storagePath: string;
  startedAt: Date;
}

@Injectable()
export class RecordingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecordingService.name);
  private activeRecordings: Map<string, ActiveRecording> = new Map();
  private readonly BACKOFF_MAX = 5;
  private crashCounters: Map<string, number> = new Map();
  private restartTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Resume recordings for cameras with recordingEnabled=true
    try {
      const cameras = await this.prisma.camera.findMany({
        where: { recordingEnabled: true, status: "ONLINE" },
        include: { organization: { include: { recordingConfig: true } } },
      });

      for (const camera of cameras) {
        const config = camera.organization?.recordingConfig;
        const codec = config?.codec || "h264";
        if (camera.rtspUrl) {
          this.startRecording(camera.id, camera.rtspUrl, codec as "h264" | "h265").catch((err) => {
            this.logger.error(`Failed to start recording for camera ${camera.id}: ${err.message}`);
          });
        }
      }
      this.logger.log(`Resumed ${cameras.length} recording(s) on module init`);
    } catch (err: any) {
      this.logger.warn(`Could not resume recordings on init: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    for (const [cameraId] of this.activeRecordings) {
      this.stopRecording(cameraId);
    }
    // Clear all pending restart timers
    for (const timer of this.restartTimers.values()) {
      clearTimeout(timer);
    }
    this.restartTimers.clear();
    this.logger.log("All recordings stopped on module destroy");
  }

  async startRecording(
    cameraId: string,
    rtspUrl: string,
    codec: "h264" | "h265" = "h264",
  ): Promise<void> {
    // Prevent duplicate recording
    if (this.activeRecordings.has(cameraId)) {
      this.logger.warn(`Recording already active for camera ${cameraId}`);
      return;
    }

    // Validate RTSP URL (T-02-12: no shell injection — spawn with args array)
    if (!rtspUrl.startsWith("rtsp://")) {
      this.logger.error(`Invalid RTSP URL for camera ${cameraId}: must start with rtsp://`);
      return;
    }

    // Get org recording config for storage path
    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
      include: { organization: { include: { recordingConfig: true } } },
    });
    if (!camera) {
      this.logger.error(`Camera ${cameraId} not found`);
      return;
    }

    const config = camera.organization?.recordingConfig;
    const basePath = config?.storagePath || "/mnt/recordings";
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const outputDir = path.join(basePath, cameraId, dateStr);

    // Create output directory
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err: any) {
      this.logger.error(`Cannot create recording directory ${outputDir}: ${err.message}`);
      return;
    }

    const codecParam = codec === "h265" ? "libx265" : "libx264";
    const segmentPath = path.join(outputDir, "segment_%Y%m%d_%H%M%S.ts");

    const ffmpegArgs = [
      "-rtsp_transport", "tcp",
      "-i", rtspUrl,
      "-c:v", codecParam,
      "-f", "hls",
      "-hls_time", "60",
      "-hls_list_size", "0",
      "-strftime", "1",
      "-y",
      segmentPath,
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    ffmpeg.stdout?.on("data", () => {
      // FFmpeg HLS output goes to stderr, not stdout
    });

    ffmpeg.stderr?.on("data", (data: Buffer) => {
      // Only log errors, not routine FFmpeg status messages
      const msg = data.toString();
      if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed")) {
        this.logger.warn(`FFmpeg [${cameraId}]: ${msg.trim()}`);
      }
    });

    ffmpeg.on("close", (code) => {
      this.activeRecordings.delete(cameraId);
      if (code !== 0 && code !== null) {
        this.logger.warn(`FFmpeg for camera ${cameraId} exited with code ${code}`);

        // Auto-restart with backoff (Rule 1: crash recovery)
        const currentCount = (this.crashCounters.get(cameraId) || 0) + 1;
        this.crashCounters.set(cameraId, currentCount);

        if (currentCount <= this.BACKOFF_MAX) {
          const delay = Math.min(1000 * Math.pow(2, currentCount - 1), 60000);
          this.logger.log(`Restarting recording for camera ${cameraId} in ${delay}ms (attempt ${currentCount})`);
          const timer = setTimeout(() => {
            this.startRecording(cameraId, rtspUrl, codec).catch((err) => {
              this.logger.error(`Restart failed for camera ${cameraId}: ${err.message}`);
            });
          }, delay);
          this.restartTimers.set(cameraId, timer);
        } else {
          this.logger.error(`Recording for camera ${cameraId} crashed ${currentCount} times — giving up`);
        }
      } else {
        // Clean exit (stopRecording called)
        this.crashCounters.delete(cameraId);
        this.logger.log(`Recording stopped for camera ${cameraId}`);
      }
    });

    ffmpeg.on("error", (err) => {
      this.activeRecordings.delete(cameraId);
      this.logger.error(`FFmpeg process error for camera ${cameraId}: ${err.message}`);
      // No auto-restart on spawn error (wrong binary, permissions)
    });

    const recording: ActiveRecording = {
      process: ffmpeg,
      cameraId,
      codec,
      storagePath: outputDir,
      startedAt: new Date(),
    };

    this.activeRecordings.set(cameraId, recording);
    this.crashCounters.delete(cameraId); // Reset crash counter on successful start
    this.logger.log(`Started recording for camera ${cameraId} (${codec}) at ${outputDir}`);
  }

  stopRecording(cameraId: string): void {
    const recording = this.activeRecordings.get(cameraId);
    if (!recording) {
      this.logger.warn(`No active recording for camera ${cameraId}`);
      return;
    }

    // Clear any pending restart timer
    const timer = this.restartTimers.get(cameraId);
    if (timer) {
      clearTimeout(timer);
      this.restartTimers.delete(cameraId);
    }

    try {
      recording.process.kill("SIGTERM");
    } catch {
      // Process may already be dead
    }
    this.activeRecordings.delete(cameraId);
    this.crashCounters.delete(cameraId);
    this.logger.log(`Stopped recording for camera ${cameraId}`);
  }

  getRecordingStatus(cameraId: string): {
    isRecording: boolean;
    codec: string | null;
    storagePath: string | null;
    estimatedSize: string | null;
    startedAt: Date | null;
  } {
    const recording = this.activeRecordings.get(cameraId);
    if (!recording) {
      return { isRecording: false, codec: null, storagePath: null, estimatedSize: null, startedAt: null };
    }

    let estimatedSize: string | null = null;
    try {
      const dirSize = this.getDirectorySize(recording.storagePath);
      estimatedSize = this.formatBytes(dirSize);
    } catch {
      // Directory may not exist yet
    }

    return {
      isRecording: true,
      codec: recording.codec,
      storagePath: recording.storagePath,
      estimatedSize,
      startedAt: recording.startedAt,
    };
  }

  async getConfig(orgId: string) {
    const config = await this.prisma.recordingConfig.findUnique({
      where: { organizationId: orgId },
    });
    return config || { retentionDays: 7, codec: "h264", storagePath: "/mnt/recordings" };
  }

  async updateConfig(orgId: string, data: { retentionDays?: number; codec?: string; storagePath?: string }) {
    const updateData: any = {};
    if (data.retentionDays !== undefined) updateData.retentionDays = data.retentionDays;
    if (data.codec !== undefined) updateData.codec = data.codec;
    if (data.storagePath !== undefined) updateData.storagePath = data.storagePath;

    return this.prisma.recordingConfig.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...updateData },
      update: updateData,
    });
  }

  async exportClip(eventId: string): Promise<{ downloadUrl: string; eventId: string }> {
    const alert = await this.prisma.alert.findUnique({
      where: { id: eventId },
      include: { camera: true },
    });

    if (!alert) {
      throw new Error("Event not found");
    }

    if (!alert.camera.rtspUrl) {
      throw new Error("Camera has no RTSP URL configured");
    }

    const clipDir = "/mnt/recordings/clips";
    const clipFilename = `export_${eventId}_${Date.now()}.mp4`;
    const clipPath = path.join(clipDir, clipFilename);

    try {
      fs.mkdirSync(clipDir, { recursive: true });
    } catch {
      // Already exists
    }

    // Compute time range: +/- 15 seconds around the alert timestamp
    const eventTime = alert.createdAt;
    const startTime = new Date(eventTime.getTime() - 15000).toISOString();
    const duration = 30; // 30 seconds total

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        "-rtsp_transport", "tcp",
        "-i", alert.camera.rtspUrl,
        "-ss", startTime,
        "-t", String(duration),
        "-c", "copy",
        "-an",
        "-y",
        clipPath,
      ];

      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.stderr?.on("data", () => {
        // Swallow FFmpeg stderr (too verbose)
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          const downloadUrl = `/api/recording/clips/${clipFilename}`;
          this.logger.log(`Clip exported for event ${eventId}: ${clipPath}`);
          resolve({ downloadUrl, eventId });
        } else {
          reject(new Error(`FFmpeg clip export failed with code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(new Error(`FFmpeg clip export error: ${err.message}`));
      });
    });
  }

  getActiveRecordingIds(): string[] {
    return Array.from(this.activeRecordings.keys());
  }

  // ── Event Handlers ──

  @OnEvent("camera.created")
  async handleCameraCreated(payload: { cameraId: string; rtspUrl: string; organizationId: string }) {
    const config = await this.prisma.recordingConfig.findUnique({
      where: { organizationId: payload.organizationId },
    });
    const codec = (config?.codec || "h264") as "h264" | "h265";
    await this.startRecording(payload.cameraId, payload.rtspUrl, codec);
  }

  @OnEvent("camera.rtsp-changed")
  async handleCameraRtspChanged(payload: { cameraId: string; rtspUrl: string; organizationId: string }) {
    // Stop existing recording if any, then start new one
    this.stopRecording(payload.cameraId);
    const config = await this.prisma.recordingConfig.findUnique({
      where: { organizationId: payload.organizationId },
    });
    const codec = (config?.codec || "h264") as "h264" | "h265";
    await this.startRecording(payload.cameraId, payload.rtspUrl, codec);
  }

  // ── Private helpers ──

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        totalSize += fs.statSync(fullPath).size;
      } else if (entry.isDirectory()) {
        totalSize += this.getDirectorySize(fullPath);
      }
    }
    return totalSize;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
