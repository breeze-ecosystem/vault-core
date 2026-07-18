import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QdrantService } from "../ai-agent/qdrant/qdrant.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";

const AI_PREPROCESSOR_URL = process.env.AI_PREPROCESSOR_URL || "http://localhost:8000";

@Injectable()
export class BastionService {
  private readonly logger = new Logger(BastionService.name);

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private eventEmitter: EventEmitter2,
    @Inject("REDIS") private redis: Redis,
  ) {}

  /**
   * Enroll a new face: validate photo → extract embedding via AI Preprocessor → store in Qdrant
   * → create Face record in Prisma → force AI Preprocessor cache refresh.
   */
  async enrollFace(dto: {
    name: string;
    photoBase64: string;
    isBlacklisted?: boolean;
    riskThreshold?: number;
    organizationId: string;
  }) {
    const { name, photoBase64, isBlacklisted, riskThreshold, organizationId } = dto;

    // 1. Send photo to AI Preprocessor for embedding extraction
    let embedding: number[];
    try {
      const response = await fetch(`${AI_PREPROCESSOR_URL}/api/v1/face/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          image_base64: photoBase64,
          organization_id: organizationId,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Preprocessor returned ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      embedding = result.embedding;
    } catch (err: any) {
      this.logger.error(`Failed to extract face embedding from AI Preprocessor: ${err.message}`);
      throw new BadRequestException("Échec de l'extraction de l'empreinte faciale");
    }

    // 2. Ensure Qdrant faces collection exists
    await this.qdrantService.ensureFacesCollection();

    // 3. Store embedding in Qdrant faces collection
    const qdrantPointId = crypto.randomUUID();
    try {
      await this.qdrantService.upsertFaces([
        {
          id: qdrantPointId,
          vector: embedding,
          payload: {
            name,
            organizationId,
            isBlacklisted: isBlacklisted ?? false,
            createdAt: new Date().toISOString(),
          },
        },
      ]);
    } catch (err: any) {
      this.logger.error(`Failed to store face embedding in Qdrant: ${err.message}`);
      throw new BadRequestException("Échec du stockage de l'empreinte faciale");
    }

    // 4. Create Face record in Prisma
    const embeddingBase64 = Buffer.from(new Float32Array(embedding).buffer).toString("base64");
    const face = await this.prisma.face.create({
      data: {
        organizationId,
        name,
        photoBase64,
        embeddingBase64,
        qdrantPointId,
        isBlacklisted: isBlacklisted ?? false,
        riskThreshold: riskThreshold ?? null,
      },
    });

    // 5. Force AI Preprocessor cache refresh
    await this.syncWhitelistCache(organizationId);

    this.logger.log(`Face enrolled: ${name} (${face.id})`);
    return face;
  }

  /**
   * List faces with optional search and blacklist filter (paginated).
   */
  async listFaces(filters?: {
    organizationId?: string;
    page?: number;
    limit?: number;
    search?: string;
    blacklisted?: boolean;
  }) {
    const where: Record<string, any> = {};
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    if (filters?.blacklisted !== undefined) where.isBlacklisted = filters.blacklisted;
    if (filters?.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.face.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.face.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Get a single face by ID with passage history count.
   */
  async getFace(id: string) {
    const face = await this.prisma.face.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
    if (!face) throw new NotFoundException("Visage non trouvé");
    return face;
  }

  /**
   * Update face metadata (name, blacklist status, risk threshold).
   * If blacklist status changed, also update Qdrant payload + force cache refresh.
   */
  async updateFace(id: string, dto: {
    name?: string;
    isBlacklisted?: boolean;
    riskThreshold?: number;
    organizationId?: string;
  }) {
    const face = await this.prisma.face.findUnique({ where: { id } });
    if (!face) throw new NotFoundException("Visage non trouvé");

    const previousBlacklisted = face.isBlacklisted;

    const updated = await this.prisma.face.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isBlacklisted !== undefined && { isBlacklisted: dto.isBlacklisted }),
        ...(dto.riskThreshold !== undefined && { riskThreshold: dto.riskThreshold }),
      },
    });

    // If blacklist status changed, update Qdrant payload + cache refresh
    if (dto.isBlacklisted !== undefined && previousBlacklisted !== dto.isBlacklisted) {
      await this.updateQdrantFacePayload(face.qdrantPointId, {
        isBlacklisted: dto.isBlacklisted,
      });

      if (dto.organizationId) {
        await this.syncWhitelistCache(dto.organizationId);
      }
    }

    return updated;
  }

  /**
   * Delete a face: remove from Prisma + Qdrant + refresh cache.
   */
  async deleteFace(id: string) {
    const face = await this.prisma.face.findUnique({ where: { id } });
    if (!face) throw new NotFoundException("Visage non trouvé");

    await this.prisma.face.delete({ where: { id } });

    if (face.qdrantPointId) {
      await this.qdrantService.deleteFacePoints([face.qdrantPointId]);
    }

    this.logger.log(`Face deleted: ${face.name} (${face.id})`);
    return { deleted: true, id };
  }

  /**
   * Toggle blacklist status for a face. Updates both Prisma and Qdrant.
   */
  async toggleBlacklist(id: string) {
    const face = await this.prisma.face.findUnique({
      where: { id },
      include: { organization: { select: { id: true } } },
    });
    if (!face) throw new NotFoundException("Visage non trouvé");

    const newBlacklisted = !face.isBlacklisted;

    const updated = await this.prisma.face.update({
      where: { id },
      data: { isBlacklisted: newBlacklisted },
    });

    if (face.qdrantPointId) {
      await this.updateQdrantFacePayload(face.qdrantPointId, {
        isBlacklisted: newBlacklisted,
      });
    }

    await this.syncWhitelistCache(face.organization.id);

    this.logger.log(`Face ${face.name} blacklist toggled: ${newBlacklisted}`);
    return updated;
  }

  /**
   * Get passage history for a specific face (paginated).
   */
  async getFacePassages(faceId: string, pagination?: { page?: number; limit?: number }) {
    const face = await this.prisma.face.findUnique({ where: { id: faceId } });
    if (!face) throw new NotFoundException("Visage non trouvé");

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.facePassage.findMany({
        where: { faceId },
        orderBy: { detectedAt: "desc" },
        skip,
        take: limit,
        include: {
          camera: { select: { id: true, name: true } },
        },
      }),
      this.prisma.facePassage.count({ where: { faceId } }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * List recent face detection passages (paginated, filterable).
   */
  async listPassages(filters?: {
    organizationId?: string;
    cameraId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Record<string, any> = {};
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    if (filters?.cameraId) where.cameraId = filters.cameraId;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.facePassage.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        skip,
        take: limit,
        include: {
          camera: { select: { id: true, name: true } },
          face: { select: { id: true, name: true, isBlacklisted: true } },
        },
      }),
      this.prisma.facePassage.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Private Helpers ──

  /**
   * Force AI Preprocessor whitelist cache refresh via HTTP POST.
   */
  private async syncWhitelistCache(orgId: string): Promise<void> {
    try {
      const response = await fetch(`${AI_PREPROCESSOR_URL}/api/v1/face/refresh-whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId }),
      });
      if (!response.ok) {
        this.logger.warn(`AI Preprocessor cache refresh returned ${response.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to refresh AI Preprocessor cache: ${err.message}`);
    }
  }

  /**
   * Update a face point's payload in Qdrant (e.g., blacklist toggle).
   */
  private async updateQdrantFacePayload(
    qdrantPointId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!qdrantPointId) return;
    await this.qdrantService.setFacePayload(qdrantPointId, payload);
  }
}
