import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LlmProviderService } from "../llm/llm-provider.service";
import type { AgentContext } from "../types/agent.types";
import type { Message } from "ollama";
import * as fs from "fs";
import * as path from "path";

export interface PatternAnalysis {
  patternId: string;
  patternName: string;
  type: string;
  description: string;
  severity: string;
  occurrences: number;
  trend: string;
  weeklyChangePercent: number;
  aiAnalysis: string;
  recommendations: string[];
}

@Injectable()
export class PatternDetectionAgent {
  private readonly logger = new Logger(PatternDetectionAgent.name);
  private readonly systemPrompt: string;

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly prisma: PrismaService,
  ) {
    this.systemPrompt = this.loadPrompt("pattern-detection.prompt.md");
    this.logger.log("PatternDetectionAgent initialized");
  }

  /**
   * Analyze a detected pattern and generate trend analysis.
   */
  async analyze(
    patternId: string,
    context: AgentContext,
  ): Promise<PatternAnalysis | null> {
    try {
      // Fetch detected patterns from hypertable
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          pattern_name: string;
          pattern_type: string;
          description: string;
          severity: string;
          occurrence_count: number;
          first_seen: Date;
          last_seen: Date;
          metadata: unknown;
        }>
      >(
        `SELECT id::text, pattern_name, pattern_type, description, severity::text,
                occurrence_count, first_seen, last_seen, metadata
         FROM detected_patterns
         WHERE id = $1::uuid
           AND organization_id = $2::uuid
         LIMIT 1`,
        patternId,
        context.organizationId,
      );

      if (rows.length === 0) {
        this.logger.warn(`Pattern ${patternId} not found for org ${context.organizationId}`);
        return null;
      }

      const pattern = rows[0];

      // Build analysis prompt
      const prompt = this.systemPrompt.replace(
        "{{user_message}}",
        `Analyse ce motif de sécurité détecté:\n- Nom: ${pattern.pattern_name}\n- Type: ${pattern.pattern_type}\n- Description: ${pattern.description}\n- Sévérité: ${pattern.severity}\n- Occurrences: ${pattern.occurrence_count}\n- Première détection: ${pattern.first_seen.toISOString()}\n- Dernière détection: ${pattern.last_seen.toISOString()}\n\nGénère une analyse de tendance détaillée avec recommandations.`,
      );

      const messages: Message[] = [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `<user_query>Analyse du motif: ${pattern.pattern_name}</user_query>`,
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
        const patterns = parsed.patterns || [parsed];
        const primary = patterns[0] || {};

        return {
          patternId: pattern.id,
          patternName: pattern.pattern_name,
          type: pattern.pattern_type,
          description: pattern.description,
          severity: pattern.severity,
          occurrences: pattern.occurrence_count,
          trend: primary.frequency || "daily",
          weeklyChangePercent: primary.confidence
            ? Math.round(primary.confidence * 100)
            : 0,
          aiAnalysis: primary.description || parsed.summary || "Analyse non disponible",
          recommendations: [primary.recommendation || "Surveiller le motif"].filter(Boolean),
        };
      }
    } catch (err: unknown) {
      this.logger.error(
        `PatternDetectionAgent.analyze failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return null;
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
