import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LlmProviderService } from "../llm/llm-provider.service";
import { SkillRegistry } from "../skills/skill-registry.service";
import type { AgentContext, AgentResult, ToolCallRecord } from "../types/agent.types";
import type { Message, Tool } from "ollama";
import type { ToolExecutor } from "../llm/llm-provider.service";
import * as fs from "fs";
import * as path from "path";

interface TimelineEntry {
  time: string;
  event_type: string;
  organization_id: string;
  door_id?: string;
  door_name?: string;
  credential_id?: string;
  user_name?: string;
  decision?: string;
  summary: string;
  camera_id?: string;
  snapshot_url?: string;
}

@Injectable()
export class EventSearchAgent {
  private readonly logger = new Logger(EventSearchAgent.name);
  private readonly systemPrompt: string;

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly prisma: PrismaService,
    private readonly skillRegistry: SkillRegistry,
  ) {
    this.systemPrompt = this.loadPrompt("event-search.prompt.md");
    this.logger.log("EventSearchAgent initialized");
  }

  /**
   * Convert natural language query to structured search and execute.
   * Follows AiService.naturalLanguageQuery() pattern.
   */
  async search(
    query: string,
    context: AgentContext,
  ): Promise<{
    results: TimelineEntry[];
    summary: string;
  }> {
    const messages: Message[] = [
      { role: "system", content: this.systemPrompt },
      {
        role: "user",
        content: `<user_query>${query}</user_query>`,
      },
    ];

    try {
      const response = await this.llmProvider.chat(messages);
      const spec = this.parseSearchResponse(response.message.content);

      this.logger.debug(
        `Parsed search spec: event_types=[${spec.event_types?.join(",")}]`,
      );

      const results = await this.executeEventQuery(spec, context.organizationId);
      const summary = `${results.length} événement(s) trouvé(s)${
        spec.query_summary ? `: ${spec.query_summary}` : ""
      }`;

      return { results, summary };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`EventSearchAgent.search failed: ${message}`);
      return {
        results: [],
        summary: "Erreur lors de la recherche d'événements.",
      };
    }
  }

  // ── Parse LLM search response ──

  private parseSearchResponse(response: string): {
    event_types: string[];
    filters: Record<string, string | undefined>;
    query_summary: string;
  } {
    const jsonMatch = response.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      return { event_types: [], filters: {}, query_summary: "" };
    }

    let jsonStr = jsonMatch[1]
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        event_types: Array.isArray(parsed.event_types)
          ? parsed.event_types
          : [],
        filters: parsed.filters || {},
        query_summary:
          parsed.query_summary || parsed.query_description || "",
      };
    } catch {
      this.logger.warn(
        `Failed to parse search response: ${jsonStr.substring(0, 100)}`,
      );
      return { event_types: [], filters: {}, query_summary: "" };
    }
  }

  // ── Execute hybrid Qdrant+SQL search (follows AiService.executeEventQuery pattern) ──

  private async executeEventQuery(
    spec: { event_types: string[]; filters: Record<string, string | undefined> },
    organizationId: string,
  ): Promise<TimelineEntry[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (organizationId) {
      conditions.push(`ae.organization_id = $${idx}::uuid`);
      values.push(organizationId);
      idx++;
    }

    if (spec.filters.from_time) {
      conditions.push(`ae.time >= $${idx}::timestamptz`);
      values.push(new Date(spec.filters.from_time));
      idx++;
    }

    if (spec.filters.to_time) {
      conditions.push(`ae.time <= $${idx}::timestamptz`);
      values.push(new Date(spec.filters.to_time));
      idx++;
    }

    if (!spec.filters.from_time && !spec.filters.to_time) {
      conditions.push(`ae.time >= NOW() - INTERVAL '30 days'`);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const queryAccessEvents =
      !spec.event_types.length ||
      spec.event_types.some((t) =>
        ["access_granted", "access_denied", "door_access", "badge_scan", "badge_denied"].includes(t),
      );

    const queryDoorEvents =
      !spec.event_types.length ||
      spec.event_types.some((t) =>
        [
          "door_forced",
          "door_held_open",
          "door_unsecured",
          "door_desynchronized",
        ].includes(t),
      );

    const results: TimelineEntry[] = [];

    if (queryAccessEvents) {
      try {
        const rows = await this.prisma.$queryRawUnsafe<
          Array<{
            id: string;
            time: Date;
            organization_id: string;
            door_id: string;
            decision: string;
            credential_id: string;
            user_name: string;
            metadata: unknown;
          }>
        >(
          `SELECT id::text, time, organization_id::text, door_id::text,
                  decision::text,
                  COALESCE(metadata->>'credential_id', '') as credential_id,
                  COALESCE(metadata->>'user_name', '') as user_name,
                  metadata
           FROM access_events ae
           ${whereClause}
           ORDER BY ae.time DESC
           LIMIT 50`,
          ...values,
        );

        for (const row of rows) {
          results.push({
            time: row.time.toISOString(),
            event_type:
              row.decision === "granted" ? "access_granted" : "access_denied",
            organization_id: row.organization_id,
            door_id: row.door_id,
            credential_id: row.credential_id || undefined,
            user_name: row.user_name || undefined,
            decision: row.decision,
            summary:
              row.decision === "granted" ? "Accès accordé" : "Accès refusé",
          });
        }
      } catch (err: unknown) {
        this.logger.warn(
          `access_events query failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (queryDoorEvents) {
      try {
        const abnormalStates = ["forced", "held_open"];
        const doorValues = [...values, ...abnormalStates];
        const doorParamIdx = idx;

        const rows = await this.prisma.$queryRawUnsafe<
          Array<{
            id: string;
            time: Date;
            organization_id: string;
            door_id: string;
            state: string;
          }>
        >(
          `SELECT id::text, time, organization_id::text, door_id::text, state
           FROM door_state_log
           WHERE state IN ($${doorParamIdx}::text, $${doorParamIdx + 1}::text)
           AND organization_id = $1::uuid
           ORDER BY time DESC
           LIMIT 50`,
          ...doorValues,
        );

        for (const row of rows) {
          results.push({
            time: row.time.toISOString(),
            event_type: `door_${row.state}`,
            organization_id: row.organization_id,
            door_id: row.door_id,
            summary: `État de porte anormal: ${row.state}`,
          });
        }
      } catch (err: unknown) {
        this.logger.warn(
          `door_state_log query failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    results.sort(
      (a, b) =>
        new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
    return results.slice(0, 50);
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
