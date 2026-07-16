import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LlmProviderService } from "../llm/llm-provider.service";
import type { AgentContext } from "../types/agent.types";
import type { Message } from "ollama";
import * as fs from "fs";
import * as path from "path";

export interface RiskExplanation {
  zoneName: string;
  zoneId: string;
  currentScore: number;
  scoreBreakdown: Record<string, number>;
  contributingEvents: Array<{
    type: string;
    description: string;
    time: string;
    impact: string;
  }>;
  aiSummary: string;
  recommendations: string[];
}

@Injectable()
export class RiskAnalysisAgent {
  private readonly logger = new Logger(RiskAnalysisAgent.name);
  private readonly systemPrompt: string;

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly prisma: PrismaService,
  ) {
    this.systemPrompt = this.loadPrompt("risk-analysis.prompt.md");
    this.logger.log("RiskAnalysisAgent initialized");
  }

  /**
   * Generate AI explanation for zone risk scores.
   * Follows AiService.answerQuestion() pattern.
   */
  async explain(
    zoneId: string,
    context: AgentContext,
  ): Promise<RiskExplanation> {
    try {
      // Fetch zone info
      const zone = await this.prisma.zone.findUnique({
        where: { id: zoneId },
        select: { id: true, name: true, organizationId: true },
      });

      if (!zone) {
        return {
          zoneName: "Inconnue",
          zoneId,
          currentScore: 0,
          scoreBreakdown: {},
          contributingEvents: [],
          aiSummary: "Zone non trouvée",
          recommendations: [],
        };
      }

      // Fetch recent events for the zone
      let recentEvents: Array<{
        event_type: string;
        summary: string;
        time: Date;
      }> = [];

      try {
        recentEvents = await this.prisma.$queryRawUnsafe<
          Array<{ event_type: string; summary: string; time: Date }>
        >(
          `SELECT decision::text as event_type,
                  COALESCE(metadata->>'summary', 'Accès') as summary,
                  time
           FROM access_events
           WHERE organization_id = $1::uuid
             AND time >= NOW() - INTERVAL '24 hours'
           ORDER BY time DESC
           LIMIT 20`,
          context.organizationId,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Recent events query failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Build context-rich prompt
      const eventsContext = recentEvents
        .map(
          (e) =>
            `- [${e.event_type}] ${e.time.toISOString()}: ${e.summary}`,
        )
        .join("\n");

      const prompt = this.systemPrompt.replace(
        "{{user_message}}",
        `Analyse le risque pour la zone: ${zone.name} (ID: ${zoneId}).\n\nÉvénements récents (24h):\n${eventsContext || "Aucun événement récent"}\n\nGénère une analyse de risque détaillée en JSON.`,
      );

      const messages: Message[] = [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `<user_query>Analyse de risque pour la zone ${zone.name}</user_query>`,
        },
      ];

      const response = await this.llmProvider.chat(messages);
      const content = response.message.content;

      // Parse JSON response
      const jsonMatch = content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(
          jsonMatch[1].replace(/```json\s*/g, "").replace(/```\s*/g, ""),
        );
        return {
          zoneName: zone.name,
          zoneId,
          currentScore: parsed.score || 0,
          scoreBreakdown: parsed.factors
            ? Object.fromEntries(
                parsed.factors.map((f: { name: string; score: number }) => [
                  f.name,
                  f.score,
                ]),
              )
            : {},
          contributingEvents: recentEvents.map((e) => ({
            type: e.event_type,
            description: e.summary,
            time: e.time.toISOString(),
            impact: "moderate",
          })),
          aiSummary: parsed.summary || "Analyse non disponible",
          recommendations: (parsed.recommendations || []).map(
            (r: { action: string; priority: string }) =>
              `${r.action} (${r.priority})`,
          ),
        };
      }
    } catch (err: unknown) {
      this.logger.error(
        `RiskAnalysisAgent.explain failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      zoneName: "Erreur",
      zoneId,
      currentScore: 0,
      scoreBreakdown: {},
      contributingEvents: [],
      aiSummary: "L'analyse de risque n'a pas pu être générée.",
      recommendations: [],
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
