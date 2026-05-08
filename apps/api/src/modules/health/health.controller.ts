import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Simple health check" })
  async health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    };
  }

  @Get("detailed")
  @ApiOperation({ summary: "Detailed health check with system metrics" })
  async healthDetailed() {
    const os = require("os");
    const checks: Record<string, any> = {};
    let overallStatus = "ok";

    // ── Database check ──
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: "up",
        latency_ms: Date.now() - dbStart,
      };
    } catch (e: any) {
      checks.database = { status: "down", error: e.message };
      overallStatus = "degraded";
    }

    // ── Redis check ──
    try {
      const redisHost = this.configService.get("redis.host", "localhost");
      const redisPort = this.configService.get("redis.port", 6379);
      const redisPassword = this.configService.get("redis.password", "");
      const Redis = require("ioredis");
      const redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        connectTimeout: 3000,
      });
      const redisStart = Date.now();
      await redis.ping();
      checks.redis = { status: "up", latency_ms: Date.now() - redisStart };
      redis.disconnect();
    } catch (e: any) {
      checks.redis = { status: "down", error: e.message };
      overallStatus = "degraded";
    }

    // ── Ollama check ──
    try {
      const ollamaUrl =
        this.configService.get("ai.ollamaBaseUrl") ||
        "http://localhost:11434";
      const http = require("http");
      const ollamaStart = Date.now();
      const tags = await new Promise<any>((resolve, reject) => {
        http
          .get(`${ollamaUrl}/api/tags`, (res: any) => {
            let data = "";
            res.on("data", (chunk: any) => (data += chunk));
            res.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch {
                reject(new Error("Invalid response"));
              }
            });
          })
          .on("error", reject);
        setTimeout(() => reject(new Error("Timeout")), 3000);
      });
      const models = tags.models?.map((m: any) => m.name) || [];
      checks.ollama = {
        status: "up",
        latency_ms: Date.now() - ollamaStart,
        models,
      };
    } catch (e: any) {
      checks.ollama = { status: "down", error: e.message };
      // Ollama down doesn't mean system is down, just AI features unavailable
    }

    // ── AI Preprocessor check ──
    try {
      const aiUrl =
        this.configService.get("ai.preprocessorUrl") ||
        "http://localhost:8000";
      const http = require("http");
      const aiStart = Date.now();
      await new Promise<void>((resolve, reject) => {
        http
          .get(`${aiUrl}/health`, (res: any) => {
            res.resume();
            if (res.statusCode === 200) resolve();
            else reject(new Error(`HTTP ${res.statusCode}`));
          })
          .on("error", reject);
        setTimeout(() => reject(new Error("Timeout")), 3000);
      });
      checks.ai_preprocessor = {
        status: "up",
        latency_ms: Date.now() - aiStart,
      };
    } catch (e: any) {
      checks.ai_preprocessor = { status: "down", error: e.message };
    }

    // ── System metrics ──
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = Math.round((usedMem / totalMem) * 100);

    if (memoryUsagePercent > 95) {
      overallStatus = "degraded";
    }

    const system = {
      memory: {
        total_mb: Math.round(totalMem / 1024 / 1024),
        used_mb: Math.round(usedMem / 1024 / 1024),
        free_mb: Math.round(freeMem / 1024 / 1024),
        usage_pct: memoryUsagePercent,
      },
      cpu_cores: os.cpus().length,
      uptime_seconds: Math.round(os.uptime()),
      node_version: process.version,
      process_memory_mb: Math.round(
        process.memoryUsage().rss / 1024 / 1024
      ),
    };

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      services: checks,
      system,
    };
  }
}
