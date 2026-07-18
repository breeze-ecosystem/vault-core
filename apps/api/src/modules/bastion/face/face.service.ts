import { Injectable, Logger } from "@nestjs/common";
import { QdrantService } from "../../ai-agent/qdrant/qdrant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

const AI_PREPROCESSOR_URL = process.env.AI_PREPROCESSOR_URL || "http://localhost:8000";

@Injectable()
export class FaceService {
  private readonly logger = new Logger(FaceService.name);

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private configService: ConfigService,
  ) {}

  /**
   * Extract face embedding from a photo via AI Preprocessor.
   * Returns the embedding vector (512-d array of numbers).
   */
  async extractEmbedding(photoBase64: string): Promise<number[]> {
    try {
      const response = await fetch(`${AI_PREPROCESSOR_URL}/api/v1/face/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: photoBase64 }),
      });

      if (!response.ok) {
        throw new Error(`AI Preprocessor returned ${response.status}`);
      }

      const result = await response.json();
      return result.embedding;
    } catch (err: any) {
      this.logger.error(`Failed to extract face embedding: ${err.message}`);
      throw err;
    }
  }

  /**
   * Trigger AI Preprocessor whitelist cache refresh for an organization.
   */
  async syncWhitelistCache(orgId: string): Promise<void> {
    try {
      const response = await fetch(`${AI_PREPROCESSOR_URL}/api/v1/face/refresh-whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId }),
      });

      if (!response.ok) {
        this.logger.warn(`Cache refresh returned ${response.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`Cache refresh failed: ${err.message}`);
    }
  }

  /**
   * Search for matching faces in Qdrant given a photo.
   * Returns matches with similarity scores.
   */
  async searchMatches(
    photoBase64: string,
    organizationId: string,
    limit: number = 5,
  ): Promise<Array<{ id: string | number; score: number; payload: Record<string, unknown> }>> {
    // Extract embedding from the photo
    const embedding = await this.extractEmbedding(photoBase64);

    // Search Qdrant faces collection
    return this.qdrantService.searchFaces(embedding, { organizationId, limit });
  }
}
