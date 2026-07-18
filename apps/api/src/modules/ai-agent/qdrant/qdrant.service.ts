import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload: Record<string, unknown>;
}

export interface QdrantSearchFilter {
  organizationId: string;
  eventType?: string;
  zone?: string;
  timeRange?: { from: string; to: string };
  limit?: number;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly qdrantUrl: string;

  // D-17: Qwen embeddings = 4096-dim with Cosine distance
  private readonly VECTOR_SIZE = 4096;
  // D-10: ArcFace embeddings = 512-dim with Cosine distance
  private readonly FACE_VECTOR_SIZE = 512;
  private readonly DISTANCE = "Cosine" as const;

  // Collection names
  private readonly COLLECTIONS = {
    events: "events",
    knowledge: "knowledge",
    incidents: "incidents",
    faces: "faces",
  } as const;

  constructor(private readonly configService: ConfigService) {
    this.qdrantUrl = this.configService.get<string>(
      "qdrantUrl",
      "http://localhost:6333",
    );
    this.client = new QdrantClient({ url: this.qdrantUrl });
    this.logger.log(`QdrantService initialized with URL: ${this.qdrantUrl}`);
  }

  async onModuleInit(): Promise<void> {
    await this.initializeCollections();
  }

  /**
   * Create the 3 Qdrant collections if they don't already exist.
   * Called on module init to ensure collections are available before any writes.
   * Per D-17: all collections use 4096-dim Cosine distance for Qwen embeddings.
   */
  async initializeCollections(): Promise<void> {
    try {
      const existing = await this.client.getCollections();
      const existingNames = new Set(
        existing.collections.map((c) => c.name),
      );

      const collectionNames: Array<{ name: string; size: number }> = [
        { name: this.COLLECTIONS.events, size: this.VECTOR_SIZE },
        { name: this.COLLECTIONS.knowledge, size: this.VECTOR_SIZE },
        { name: this.COLLECTIONS.incidents, size: this.VECTOR_SIZE },
        { name: this.COLLECTIONS.faces, size: this.FACE_VECTOR_SIZE },
      ];

      for (const { name, size } of collectionNames) {
        if (!existingNames.has(name)) {
          await this.client.createCollection(name, {
            vectors: {
              size,
              distance: this.DISTANCE,
            },
          });
          this.logger.log(`Qdrant collection created: ${name} (${size}-d)`);
        }
      }

      this.logger.log(
        `Qdrant collections ready: ${collectionNames.join(", ")}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Qdrant collection init failed (Qdrant may be offline): ${err.message}`,
      );
    }
  }

  /**
   * Bulk upsert points to the events collection.
   * @param points Array of { id, vector, payload } to upsert.
   */
  async upsertEvents(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;

    try {
      await this.client.upsert(this.COLLECTIONS.events, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      this.logger.debug(`Upserted ${points.length} event(s) to Qdrant`);
    } catch (err: any) {
      this.logger.warn(`Qdrant upsertEvents failed: ${err.message}`);
      // Fail-transparent per D-12 — pgvector write must not be blocked
    }
  }

  /**
   * Hybrid search over the events collection.
   * Always filters by organizationId for tenant isolation (T-09-21).
   */
  async searchEvents(
    queryEmbedding: number[],
    filters: QdrantSearchFilter,
  ): Promise<QdrantSearchResult[]> {
    const must: Array<{ key: string; match: { value: unknown } }> = [
      {
        key: "organizationId",
        match: { value: filters.organizationId },
      },
    ];

    if (filters.eventType) {
      must.push({
        key: "event_type",
        match: { value: filters.eventType },
      });
    }

    if (filters.zone) {
      must.push({
        key: "zone",
        match: { value: filters.zone },
      });
    }

    const qdrantFilter = { must };

    try {
      const result = await this.client.search(this.COLLECTIONS.events, {
        vector: queryEmbedding,
        filter: qdrantFilter,
        limit: filters.limit ?? 10,
        with_payload: true,
      });

      return result.map((r) => ({
        id: r.id,
        score: r.score,
        payload: (r.payload ?? {}) as Record<string, unknown>,
      }));
    } catch (err: any) {
      this.logger.warn(`Qdrant searchEvents failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Upsert a knowledge entry for agent memory (RAG context).
   */
  async upsertKnowledge(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;

    try {
      await this.client.upsert(this.COLLECTIONS.knowledge, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      this.logger.debug(`Upserted ${points.length} knowledge entry/ies to Qdrant`);
    } catch (err: any) {
      this.logger.warn(`Qdrant upsertKnowledge failed: ${err.message}`);
    }
  }

  /**
   * Search the knowledge collection for agent RAG context.
   */
  async searchKnowledge(
    queryEmbedding: number[],
    filters: QdrantSearchFilter,
  ): Promise<QdrantSearchResult[]> {
    const must: Array<{ key: string; match: { value: unknown } }> = [
      {
        key: "organizationId",
        match: { value: filters.organizationId },
      },
    ];

    try {
      const result = await this.client.search(this.COLLECTIONS.knowledge, {
        vector: queryEmbedding,
        filter: { must },
        limit: filters.limit ?? 10,
        with_payload: true,
      });

      return result.map((r) => ({
        id: r.id,
        score: r.score,
        payload: (r.payload ?? {}) as Record<string, unknown>,
      }));
    } catch (err: any) {
      this.logger.warn(`Qdrant searchKnowledge failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Bulk upsert face embeddings to the `faces` collection (512-d Cosine).
   * @param points Array of { id, vector, payload } to upsert.
   */
  async upsertFaces(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;

    try {
      await this.client.upsert(this.COLLECTIONS.faces, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      this.logger.debug(`Upserted ${points.length} face(s) to Qdrant`);
    } catch (err: any) {
      this.logger.warn(`Qdrant upsertFaces failed: ${err.message}`);
    }
  }

  /**
   * Search the `faces` collection for matching faces by embedding similarity.
   * Always filters by organizationId for tenant isolation.
   */
  async searchFaces(
    queryEmbedding: number[],
    filters: { organizationId: string; limit?: number },
  ): Promise<QdrantSearchResult[]> {
    const must: Array<{ key: string; match: { value: unknown } }> = [
      {
        key: "organizationId",
        match: { value: filters.organizationId },
      },
    ];

    try {
      const result = await this.client.search(this.COLLECTIONS.faces, {
        vector: queryEmbedding,
        filter: { must },
        limit: filters.limit ?? 5,
        with_payload: true,
      });

      return result.map((r) => ({
        id: r.id,
        score: r.score,
        payload: (r.payload ?? {}) as Record<string, unknown>,
      }));
    } catch (err: any) {
      this.logger.warn(`Qdrant searchFaces failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Delete face embedding points from the `faces` collection by their Qdrant point IDs.
   * @param pointIds Array of Qdrant point IDs to delete.
   */
  async deleteFacePoints(pointIds: string[]): Promise<void> {
    if (pointIds.length === 0) return;

    try {
      await this.client.delete(this.COLLECTIONS.faces, {
        wait: true,
        points: pointIds,
      });
      this.logger.debug(`Deleted ${pointIds.length} face point(s) from Qdrant`);
    } catch (err: any) {
      this.logger.warn(`Qdrant deleteFacePoints failed: ${err.message}`);
    }
  }

  /**
   * Set a payload field on an existing face point in the `faces` collection.
   * Used for updating blacklist status, name changes, etc.
   */
  async setFacePayload(pointId: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.client.setPayload(this.COLLECTIONS.faces, {
        points: [pointId],
        payload,
      });
      this.logger.debug(`Face payload updated for point ${pointId}`);
    } catch (err: any) {
      this.logger.warn(`Qdrant setFacePayload failed: ${err.message}`);
    }
  }

  /**
   * Idempotent creation of the `faces` collection. Checks if exists before creating.
   * Called on first face access to ensure collection is ready.
   */
  async ensureFacesCollection(): Promise<void> {
    try {
      const existing = await this.client.getCollections();
      const existingNames = new Set(
        existing.collections.map((c) => c.name),
      );

      if (!existingNames.has(this.COLLECTIONS.faces)) {
        await this.client.createCollection(this.COLLECTIONS.faces, {
          vectors: {
            size: this.FACE_VECTOR_SIZE,
            distance: this.DISTANCE,
          },
        });
        this.logger.log(`Qdrant faces collection created (${this.FACE_VECTOR_SIZE}-d)`);
      }
    } catch (err: any) {
      this.logger.warn(
        `Qdrant ensureFacesCollection failed (Qdrant may be offline): ${err.message}`,
      );
    }
  }

  /**
   * Health check against Qdrant REST API.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.qdrantUrl}/healthz`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
