import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LlmProviderService } from "../llm/llm-provider.service";
import type { AgentContext } from "../types/agent.types";
import type { Message } from "ollama";
import * as fs from "fs";
import * as path from "path";

export interface IncidentSummary {
  incidentId: string;
  timeline: Array<{
    timestamp: string;
    event_type: string;
    description: string;
    zone?: string;
    persons_involved?: string[];
  }>;
  zonesAffected: Array<{ zone_id: string; zone_name: string; impact: string }>;
  personsOfInterest: Array<{
    user_id?: string;
    user_name: string;
    role: string;
    involvement: string;
  }>;
  videoEvidence: Array<{
    camera_id?: string;
    camera_name: string;
    timestamps: string[];
    description: string;
  }>;
  recommendedActions: Array<{
    action: string;
    priority: string;
    assigned_to: string;
  }>;
  summary: string;
}

@Injectable()
export class IncidentAgent {
  private readonly logger = new Logger(IncidentAgent.name);
  private readonly systemPrompt: string;

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly prisma: PrismaService,
  ) {
    this.systemPrompt = this.loadPrompt("incident.prompt.md");
    this.logger.log("IncidentAgent initialized");
  }

  /**
   * Generate structured incident summary on incident.resolved/escalated.
   * Follows AiService.generateIncidentSummary() pattern.
   */
  async generateSummary(
    incidentId: string,
    context: AgentContext,
  ): Promise<IncidentSummary> {
    try {
      // Fetch incident with full context
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          comments: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          evidence: {
            include: {
              uploadedBy: { select: { firstName: true, lastName: true } },
            },
          },
          alert: { select: { id: true, title: true, severity: true } },
        },
      });

      if (!incident) {
        return {
          incidentId,
          timeline: [],
          zonesAffected: [],
          personsOfInterest: [],
          videoEvidence: [],
          recommendedActions: [],
          summary: "Incident non trouvé",
        };
      }

      // Fetch status history from incident_events hypertable
      let statusHistory: string[] = [];
      try {
        const rows = await this.prisma.$queryRaw<
          Array<{
            time: Date;
            status: string;
            previous_status: string | null;
          }>
        >`
          SELECT time, status, previous_status
          FROM incident_events
          WHERE incident_id = ${incidentId}::uuid
          ORDER BY time ASC
        `;
        statusHistory = rows.map(
          (r) =>
            `${r.time.toISOString()}: ${r.previous_status || "CREATED"} → ${r.status}`,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Could not query incident_events: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Build context object for LLM
      const incidentContext = {
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.createdAt.toISOString(),
        resolvedAt:
          incident.closedAt?.toISOString() ||
          incident.updatedAt.toISOString(),
        assignee: incident.assignedTo
          ? `${incident.assignedTo.firstName} ${incident.assignedTo.lastName}`
          : "Non assigné",
        statusHistory: statusHistory.join("\n") || "Aucun historique",
        comments:
          incident.comments
            .map((c) => `${c.user?.firstName}: ${c.text}`)
            .join("\n") || "Aucun commentaire",
        evidenceCount: incident.evidence.length,
        evidenceTypes: [
          ...new Set(incident.evidence.map((e) => e.type)),
        ].join(", "),
        sourceAlert: incident.alert?.title || "Manuel",
      };

      const prompt = this.systemPrompt.replace(
        "{{user_message}}",
        `Génère un résumé structuré pour cet incident:\n${JSON.stringify(incidentContext, null, 2)}\n\nRéponds UNIQUEMENT en JSON valide avec le format requis.`,
      );

      const messages: Message[] = [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `<user_query>Résumé d'incident: ${incident.title}</user_query>`,
        },
      ];

      const response = await this.llmProvider.chat(messages);
      const content = response.message.content;

      // Parse JSON response (follows AiService.parseQueryResponse pattern)
      const jsonMatch = content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(
          jsonMatch[1].replace(/```json\s*/g, "").replace(/```\s*/g, ""),
        );

        // Store summary in incident.description via Prisma
        if (parsed.summary || parsed.timeline) {
          try {
            await this.prisma.incident.update({
              where: { id: incidentId },
              data: {
                description: parsed.summary || incident.description,
              },
            });
            this.logger.log(
              `Stored AI summary for incident ${incidentId}`,
            );
          } catch (err: unknown) {
            this.logger.warn(
              `Could not update incident description: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        return {
          incidentId,
          timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
          zonesAffected: Array.isArray(parsed.zones_affected)
            ? parsed.zones_affected
            : [],
          personsOfInterest: Array.isArray(parsed.persons_of_interest)
            ? parsed.persons_of_interest
            : [],
          videoEvidence: Array.isArray(parsed.video_evidence)
            ? parsed.video_evidence
            : [],
          recommendedActions: Array.isArray(parsed.recommended_actions)
            ? parsed.recommended_actions
            : [],
          summary: parsed.summary || "Résumé non disponible",
        };
      }
    } catch (err: unknown) {
      this.logger.error(
        `IncidentAgent.generateSummary failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      incidentId,
      timeline: [],
      zonesAffected: [],
      personsOfInterest: [],
      videoEvidence: [],
      recommendedActions: [
        {
          action: "Vérifier les détails de l'incident dans le système",
          priority: "high",
          assigned_to: "security_team",
        },
      ],
      summary: `L'assistant IA n'a pas pu générer le résumé. Veuillez réessayer.`,
    };
  }

  private loadPrompt(filename: string): string {
    try {
      const promptPath = path.resolve(__dirname, "..", "prompts", filename);
      return fs.readFileSync(promptPath, "utf-8");
    } catch {
      this.logger.warn(`Could not load prompt: ${filename}`);
      return "";
    }
  }
}
