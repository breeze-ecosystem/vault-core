import { Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { spawn, ChildProcess } from "child_process";

interface ActiveStream {
  process: ChildProcess;
  interval: NodeJS.Timeout;
  cameraId: string;
}

@Injectable()
export class IngestionService implements OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private streams: Map<string, ActiveStream> = new Map();

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async startStream(cameraId: string) {
    if (this.streams.has(cameraId)) {
      this.logger.warn(`Stream already active for camera ${cameraId}`);
      return;
    }

    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
      include: { prompts: { where: { isActive: true } } },
    });

    if (!camera) throw new Error(`Camera ${cameraId} not found`);

    await this.prisma.camera.update({
      where: { id: cameraId },
      data: { isRecording: true, status: "ONLINE", lastHeartbeat: new Date() },
    });

    const captureInterval = camera.captureInterval || 5;
    let lastCapture = 0;

    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastCapture < captureInterval * 1000) return;
      lastCapture = now;

      try {
        const snapshot = await this.captureFrame(camera.rtspUrl);
        if (!snapshot) {
          this.logger.warn(`No frame captured for ${cameraId}`);
          return;
        }

        this.logger.log(`Frame captured for ${camera.name} (${snapshot.length} bytes base64)`);

        await this.prisma.camera.update({
          where: { id: cameraId },
          data: { lastHeartbeat: new Date() },
        });

        if (camera.prompts.length === 0) {
          this.logger.debug(`No active prompts for ${cameraId}, skipping analysis`);
          return;
        }

        // Skip if queue is overloaded (inference takes ~3min per frame on CPU)
        const stats = await this.queueService.getFrameQueueStats();
        if (stats.waiting > 3) {
          this.logger.debug(`Queue overloaded (${stats.waiting} waiting), skipping frame for ${cameraId}`);
          return;
        }

        await this.queueService.enqueueFrame({
          cameraId: camera.id,
          siteId: camera.siteId,
          snapshotBuffer: snapshot,
          timestamp: new Date().toISOString(),
          prompts: camera.prompts.map((p) => ({
            id: p.id,
            text: p.text,
            severity: p.severity,
          })),
        });
      } catch (err: any) {
        this.logger.error(`Frame capture error for ${cameraId}: ${err.message}`);
      }
    }, captureInterval * 1000);

    this.streams.set(cameraId, {
      process: null as any,
      interval,
      cameraId,
    });

    this.logger.log(`Started ingestion for camera ${camera.name} (${cameraId}), interval: ${captureInterval}s, mode: ${camera.rtspUrl.startsWith("rtsp://") ? "RTSP" : "HTTP"}`);
  }

  private async captureFrame(url: string): Promise<string | null> {
    // HTTP snapshot (IP Webcam, etc.)
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return this.captureHttpFrame(url);
    }

    // RTSP via FFmpeg
    if (url.startsWith("rtsp://")) {
      // Try HTTP snapshot first for IP Webcam pattern (rtsp://ip:port/...)
      const httpMatch = url.match(/^rtsp:\/\/([^/]+)\/(.*)$/);
      if (httpMatch) {
        const host = httpMatch[1];
        const httpUrl = `http://${host}/shot.jpg`;
        const result = await this.captureHttpFrame(httpUrl);
        if (result) return result;
      }

      // Fall back to FFmpeg
      return this.captureRtspFrame(url);
    }

    return null;
  }

  private captureHttpFrame(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = 10000;
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, timeout);

      fetch(url, { signal: AbortSignal.timeout(timeout) })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buf) => {
          clearTimeout(timer);
          if (settled) return;
          settled = true;
          resolve(Buffer.from(buf).toString("base64"));
        })
        .catch((err) => {
          clearTimeout(timer);
          if (!settled) {
            settled = true;
            this.logger.debug(`HTTP capture failed: ${err.message}`);
            resolve(null);
          }
        });
    });
  }

  private captureRtspFrame(rtspUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = 10000;
      const chunks: Buffer[] = [];

      const args = [
        "-rtsp_transport", "tcp",
        "-i", rtspUrl,
        "-frames:v", "1",
        "-f", "image2pipe",
        "-vcodec", "mjpeg",
        "-q:v", "5",
        "-an",
        "-y",
        "pipe:1",
      ];

      const ffmpeg = spawn("ffmpeg", args, { timeout });
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          ffmpeg.kill("SIGKILL");
          resolve(null);
        }
      }, timeout);

      ffmpeg.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr?.on("data", () => {});

      ffmpeg.on("close", (code) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;

        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks).toString("base64"));
        } else {
          resolve(null);
        }
      });

      ffmpeg.on("error", () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve(null);
        }
      });
    });
  }

  async stopStream(cameraId: string) {
    const stream = this.streams.get(cameraId);
    if (!stream) return;

    clearInterval(stream.interval);
    stream.process?.kill("SIGTERM");
    this.streams.delete(cameraId);

    await this.prisma.camera.update({
      where: { id: cameraId },
      data: { isRecording: false, status: "OFFLINE" },
    });

    this.logger.log(`Stopped ingestion for camera ${cameraId}`);
  }

  async startAllActiveCameras() {
    const cameras = await this.prisma.camera.findMany({
      where: { isRecording: true },
    });
    for (const c of cameras) {
      try {
        await this.startStream(c.id);
      } catch (err: any) {
        this.logger.error(`Failed to start camera ${c.id}: ${err.message}`);
      }
    }
  }

  async captureSnapshot(cameraId: string): Promise<string | null> {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException('Camera not found');
    return this.captureFrame(camera.rtspUrl);
  }

  getActiveStreams() {
    return Array.from(this.streams.keys());
  }

  onModuleDestroy() {
    for (const [id] of this.streams) {
      this.stopStream(id);
    }
  }
}
