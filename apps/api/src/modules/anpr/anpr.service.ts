import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import Redis from "ioredis";

export interface PlateResult {
  plate: string;
  confidence: number;
  bbox: number[];
}

export interface EvaluationResult {
  decision: "ALLOW" | "DENY";
  reason: string;
}

@Injectable()
export class AnprService {
  private readonly logger = new Logger(AnprService.name);
  private readonly aiBaseUrl: string;
  private readonly cacheTtl = 3600; // 1 hour

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
    @Inject("REDIS") private redis: Redis,
  ) {
    this.aiBaseUrl = this.config.get("aiPreprocessorUrl", "http://localhost:8000");
  }

  // ── Cache warming on startup ──

  async onModuleInit() {
    try {
      await this.warmCache();
    } catch (err: any) {
      this.logger.warn(`Failed to warm ANPR cache: ${err.message}`);
    }
  }

  private async warmCache() {
    this.logger.log("Warming ANPR allowlist/blocklist cache...");
    const entries = await this.prisma.vehicleList.findMany({
      where: { isActive: true },
      select: { type: true, plate: true },
    });

    let warmed = 0;
    for (const entry of entries) {
      const key = `vehicle:${entry.type}:${entry.plate}`;
      await this.redis.setex(key, this.cacheTtl, "1");
      warmed++;
    }
    this.logger.log(`Warmed ${warmed} vehicle list entries in Redis cache`);
  }

  // ── Plate Recognition ──

  async analyzePlate(frame: string, cameraId: string): Promise<PlateResult[]> {
    try {
      const response = await fetch(`${this.aiBaseUrl}/api/v1/anpr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: frame,
          camera_id: cameraId,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`ANPR request failed: ${response.status} ${text}`);
        return [];
      }

      const data = await response.json();
      return (data.plates || []).map((p: any) => ({
        plate: p.plate,
        confidence: p.confidence,
        bbox: p.bbox || [],
      }));
    } catch (err: any) {
      this.logger.error(`ANPR analyzePlate error: ${err.message}`);
      return [];
    }
  }

  // ── Allowlist/Blocklist Evaluation ──

  async evaluatePlate(plate: string, siteId: string): Promise<EvaluationResult> {
    // Check Redis cache first
    const allowCached = await this.redis.get(`vehicle:allowlist:${plate}`);
    if (allowCached === "1") {
      return { decision: "ALLOW", reason: "allowlist" };
    }

    const denyCached = await this.redis.get(`vehicle:blocklist:${plate}`);
    if (denyCached === "1") {
      return { decision: "DENY", reason: "blocklist" };
    }

    // Not cached — query Prisma
    const allowlistEntry = await this.prisma.vehicleList.findFirst({
      where: { type: "allowlist", plate, siteId, isActive: true },
    });

    if (allowlistEntry) {
      await this.redis.setex(`vehicle:allowlist:${plate}`, this.cacheTtl, "1");
      return { decision: "ALLOW", reason: "allowlist" };
    }

    const blocklistEntry = await this.prisma.vehicleList.findFirst({
      where: { type: "blocklist", plate, siteId, isActive: true },
    });

    if (blocklistEntry) {
      await this.redis.setex(`vehicle:blocklist:${plate}`, this.cacheTtl, "1");
      return { decision: "DENY", reason: "blocklist" };
    }

    // Unknown plate → deny with "unknown" reason
    return { decision: "DENY", reason: "unknown" };
  }

  // ── Event Recording ──

  async recordEvent(
    plateData: { plate: string; confidence: number; cameraId: string; siteId: string; imageUrl?: string },
    decision: string,
    reason: string,
  ) {
    try {
      await this.prisma.$queryRawUnsafe(
        `INSERT INTO vehicle_events ("time", site_id, camera_id, plate, confidence, image_url, decision, reason)
         VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, $6::vehicle_decision, $7)`,
        plateData.siteId,
        plateData.cameraId || null,
        plateData.plate,
        plateData.confidence || null,
        plateData.imageUrl || null,
        decision,
        reason,
      );

      // Emit event for potential downstream processing
      this.eventEmitter.emit("anpr.recognized", {
        plate: plateData.plate,
        cameraId: plateData.cameraId,
        siteId: plateData.siteId,
        decision,
        reason,
        confidence: plateData.confidence,
        timestamp: new Date().toISOString(),
      });

      // If DENY due to blocklist, emit alert event
      if (decision === "DENY" && reason === "blocklist") {
        this.eventEmitter.emit("equipment.alert", {
          type: "vehicle.blocklist",
          plate: plateData.plate,
          cameraId: plateData.cameraId,
          siteId: plateData.siteId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to record vehicle event: ${err.message}`);
    }
  }

  // ── Full Pipeline Orchestration ──

  async processFrame(frame: string, cameraId: string, siteId: string, imageUrl?: string) {
    const plates = await this.analyzePlate(frame, cameraId);

    for (const plateResult of plates) {
      const evaluation = await this.evaluatePlate(plateResult.plate, siteId);

      await this.recordEvent(
        {
          plate: plateResult.plate,
          confidence: plateResult.confidence,
          cameraId,
          siteId,
          imageUrl,
        },
        evaluation.decision,
        evaluation.reason,
      );

      this.logger.log(
        `Plate ${plateResult.plate} → ${evaluation.decision} (${evaluation.reason}) @ camera ${cameraId}`,
      );
    }
  }

  // ── Allowlist/Blocklist CRUD ──

  async createListEntry(dto: {
    type: string;
    plate: string;
    siteId: string;
    description?: string;
    isActive?: boolean;
    createdById: string;
  }) {
    const entry = await this.prisma.vehicleList.create({
      data: {
        type: dto.type,
        plate: dto.plate.toUpperCase().trim(),
        siteId: dto.siteId,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        createdById: dto.createdById,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    // Flush Redis cache for this plate
    await this.flushPlateCache(dto.plate);

    return entry;
  }

  async updateListEntry(id: string, dto: { description?: string; isActive?: boolean }) {
    const entry = await this.prisma.vehicleList.findUnique({ where: { id } });
    if (!entry) {
      throw new Error("Vehicle list entry not found");
    }

    const updated = await this.prisma.vehicleList.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    // Flush Redis cache for this plate
    await this.flushPlateCache(entry.plate);

    return updated;
  }

  async deleteListEntry(id: string) {
    const entry = await this.prisma.vehicleList.findUnique({ where: { id } });
    if (!entry) {
      throw new Error("Vehicle list entry not found");
    }

    await this.prisma.vehicleList.delete({ where: { id } });

    // Flush Redis cache for this plate
    await this.flushPlateCache(entry.plate);
  }

  private async flushPlateCache(plate: string) {
    await Promise.all([
      this.redis.del(`vehicle:allowlist:${plate}`),
      this.redis.del(`vehicle:blocklist:${plate}`),
    ]);
  }

  async listEntries(type?: string, siteId?: string) {
    const where: Record<string, any> = {};
    if (type) where.type = type;
    if (siteId) where.siteId = siteId;

    return this.prisma.vehicleList.findMany({
      where,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getEntry(id: string) {
    const entry = await this.prisma.vehicleList.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!entry) {
      throw new Error("Vehicle list entry not found");
    }
    return entry;
  }

  // ── Vehicle Event Queries ──

  async queryEvents(filters: {
    plate?: string;
    siteId?: string;
    from?: string;
    to?: string;
    decision?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.plate) {
      conditions.push(`plate ILIKE $${paramIndex}`);
      params.push(`%${filters.plate}%`);
      paramIndex++;
    }

    if (filters.siteId) {
      conditions.push(`site_id = $${paramIndex}::uuid`);
      params.push(filters.siteId);
      paramIndex++;
    }

    if (filters.from) {
      conditions.push(`"time" >= $${paramIndex}::timestamptz`);
      params.push(filters.from);
      paramIndex++;
    }

    if (filters.to) {
      conditions.push(`"time" <= $${paramIndex}::timestamptz`);
      params.push(filters.to);
      paramIndex++;
    }

    if (filters.decision) {
      conditions.push(`decision = $${paramIndex}::vehicle_decision`);
      params.push(filters.decision);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      const countResult = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM vehicle_events ${whereClause}`,
        ...params,
      );
      const total = Number((countResult as any[])[0]?.total ?? 0);

      const data = await this.prisma.$queryRawUnsafe(
        `SELECT "time", site_id, camera_id, plate, confidence, image_url, decision, reason, metadata
         FROM vehicle_events ${whereClause}
         ORDER BY "time" DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        ...params,
        limit,
        offset,
      );

      return {
        data: (data as any[]).map((row: any) => ({
          time: row.time instanceof Date ? row.time.toISOString() : String(row.time),
          siteId: row.site_id,
          cameraId: row.camera_id,
          plate: row.plate,
          confidence: row.confidence,
          imageUrl: row.image_url,
          decision: row.decision,
          reason: row.reason,
          metadata: row.metadata,
        })),
        total,
        page,
        limit,
      };
    } catch (err: any) {
      this.logger.error(`Vehicle events query failed: ${err.message}`);
      return { data: [], total: 0, page, limit };
    }
  }
}
