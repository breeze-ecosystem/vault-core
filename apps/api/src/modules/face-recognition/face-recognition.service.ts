import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { VISION_MAX_FACES } from "@repo/shared";

@Injectable()
export class FaceRecognitionService {
  private readonly logger = new Logger(FaceRecognitionService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.faceWhitelist.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    const face = await this.prisma.faceWhitelist.findUnique({ where: { id } });
    if (!face) throw new NotFoundException("Visage non trouvé");
    return face;
  }

  async create(data: { name: string; imageBase64: string }, orgId: string) {
    // Enforce VISION max 50 faces limit
    const faceCount = await this.prisma.faceWhitelist.count({
      where: { organizationId: orgId },
    });

    if (faceCount >= VISION_MAX_FACES) {
      throw new BadRequestException(
        `Limite de ${VISION_MAX_FACES} visages atteinte. Passez à BASTION pour débloquer la reconnaissance illimitée.`,
      );
    }

    // Attempt to extract embedding from AI Preprocessor
    let embeddingBase64: string | null = null;
    try {
      embeddingBase64 = await this.getEmbedding(data.imageBase64);
    } catch (err: any) {
      this.logger.warn(`Embedding extraction failed, storing without embedding: ${err.message}`);
    }

    return this.prisma.faceWhitelist.create({
      data: {
        organizationId: orgId,
        name: data.name,
        imageBase64: data.imageBase64,
        embeddingBase64,
      },
    });
  }

  async update(id: string, data: { name?: string; imageBase64?: string }) {
    const face = await this.findById(id);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;

    if (data.imageBase64 !== undefined) {
      updateData.imageBase64 = data.imageBase64;
      // Re-compute embedding when image changes
      try {
        updateData.embeddingBase64 = await this.getEmbedding(data.imageBase64);
      } catch (err: any) {
        this.logger.warn(`Embedding re-extraction failed: ${err.message}`);
      }
    }

    return this.prisma.faceWhitelist.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.faceWhitelist.delete({ where: { id } });
  }

  /**
   * Calls the AI Preprocessor to extract a face embedding from an image.
   * POST /face/register — sends imageBase64, receives embeddingBase64.
   * Falls back gracefully if AI Preprocessor is unreachable.
   */
  async getEmbedding(imageBase64: string): Promise<string | null> {
    const preprocessorUrl = process.env.AI_PREPROCESSOR_URL || "http://ai-preprocessor:8000";
    try {
      const response = await fetch(`${preprocessorUrl}/face/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        this.logger.warn(`AI Preprocessor returned ${response.status} for face registration`);
        return null;
      }

      const result = await response.json() as { embeddingBase64?: string };
      return result.embeddingBase64 ?? null;
    } catch (err: any) {
      this.logger.warn(`AI Preprocessor unavailable: ${err.message}`);
      return null;
    }
  }

  /**
   * Internal endpoint data: returns whitelist entries with embeddings for AI Preprocessor cache refresh.
   */
  async getWhitelistForOrg(orgId: string) {
    const faces = await this.prisma.faceWhitelist.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        embeddingBase64: true,
      },
    });

    return faces.map((f) => ({
      id: f.id,
      name: f.name,
      embedding_base64: f.embeddingBase64,
    }));
  }
}
