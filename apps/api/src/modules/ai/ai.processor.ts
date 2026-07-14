import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";

@Processor("ai-summaries")
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private aiService: AiService,
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
    siteId: string;
    time: Date;
  }) {
    const { eventType, eventId, summary, siteId, time } = data;

    try {
      await this.aiService.embedEvent(eventType, eventId, summary, siteId, time);
      this.logger.debug(`Embedding stored for ${eventType} ${eventId}`);
      return { embedded: true, eventType, eventId };
    } catch (err: any) {
      this.logger.error(`Failed to embed event ${eventType}/${eventId}: ${err.message}`);
      return { embedded: false, eventType, eventId, error: err.message };
    }
  }
}
