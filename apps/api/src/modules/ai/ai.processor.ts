import { Logger, Inject, Optional } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";
import type { QdrantService } from "../ai-agent/qdrant/qdrant.service";
import type { LlmProviderService } from "../ai-agent/llm/llm-provider.service";

@Processor("ai-summaries")
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private aiService: AiService,
    @Optional() @Inject("QdrantService") private qdrantService?: QdrantService,
    @Optional() @Inject("LlmProviderService") private llmProvider?: LlmProviderService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "generate-summary":
        return this.handleGenerateSummary(job.data);
      case "embed-event":
        return this.handleEmbedEvent(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Generate an AI-powered incident closure summary.
   * Stores the summary on the Incident model and emits an event.
   */
  private async handleGenerateSummary(data: { incidentId: string }) {
    const { incidentId } = data;

    try {
      const result = await this.aiService.generateIncidentSummary(incidentId);

      // Store summary on the incident (store in a metadata/notes field)
      await this.prisma.incident.update({
        where: { id: incidentId },
        data: {
          description: result.summary,
        },
      });

      this.eventEmitter.emit("incident.summary-generated", {
        incidentId,
        summary: result.summary,
        keyEvents: result.keyEvents,
        recommendedActions: result.recommendedActions,
      });

      this.logger.log(`Summary generated for incident ${incidentId}`);
      return {
        generated: true,
        incidentId,
        summaryLength: result.summary.length,
        keyEventCount: result.keyEvents.length,
      };
    } catch (err: any) {
      this.logger.error(`Failed to generate summary for ${incidentId}: ${err.message}`);
      return { generated: false, incidentId, error: err.message };
    }
  }

  /**
   * Generate an embedding for an event and store it in the event_embeddings
   * hypertable for semantic search.
   */
  private async handleEmbedEvent(data: {
    eventType: string;
    eventId: string;
    summary: string;
    orgId: string;
    time: Date;
    zone?: string;
    severity?: string;
  }) {
    const { eventType, eventId, summary, orgId, time, zone, severity } = data;

    try {
      await this.aiService.embedEvent(eventType, eventId, summary, orgId, time);
      this.logger.debug(`Embedding stored for ${eventType} ${eventId}`);

      // ── Parallel Qdrant write (D-17, Pitfall 3 prevention) ──
      // Write the same event to Qdrant with Qwen (4096-dim) embedding.
      // Wrapped in try/catch so pgvector write is never blocked.
      if (this.qdrantService && this.llmProvider) {
        try {
          const qwenEmbedding = await this.llmProvider.embed(
            summary,
            "qwen-embedding",
          );
          await this.qdrantService.upsertEvents([
            {
              id: `${eventType}:${eventId}`,
              vector: qwenEmbedding,
              payload: {
                organizationId: orgId,
                event_type: eventType,
                eventId,
                zone: zone ?? null,
                time: time.toISOString(),
                severity: severity ?? null,
                summary,
              },
            },
          ]);
          this.logger.debug(
            `Qdrant upsert for ${eventType} ${eventId}`,
          );
        } catch (qdrantErr: any) {
          this.logger.warn(
            `Qdrant parallel write failed for ${eventType}/${eventId}: ${qdrantErr.message}`,
          );
        }
      }

      return { embedded: true, eventType, eventId };
    } catch (err: any) {
      this.logger.error(`Failed to embed event ${eventType}/${eventId}: ${err.message}`);
      return { embedded: false, eventType, eventId, error: err.message };
    }
  }
}
