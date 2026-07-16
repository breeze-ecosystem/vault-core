import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { LlmProviderService } from "./llm/llm-provider.service";
import { SkillRegistry } from "./skills/skill-registry.service";
import type { AgentContext } from "./types/agent.types";
import type { Message } from "ollama";
import * as fs from "fs";
import * as path from "path";

export interface OrchestratorPlan {
  agents: string[];
  steps: Array<{ agent: string; query: string }>;
}

export interface SSEEvent {
  type: "thinking" | "content" | "tool_call" | "tool_result" | "error" | "done";
  data: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly orchestratorPrompt: string;

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly skillRegistry: SkillRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Load orchestrator prompt at construction time (cached)
    this.orchestratorPrompt = this.loadPrompt("orchestrator.prompt.md");
    this.logger.log("OrchestratorService initialized");
  }

  // ── Main entry point: SSE streaming ──

  async *executeQuery(
    userMessage: string,
    context: AgentContext,
  ): AsyncGenerator<SSEEvent> {
    this.logger.log(
      `Executing query for user ${context.userId}: "${userMessage.substring(0, 80)}..."`,
    );

    // (a) Yield thinking indicator
    yield { type: "thinking", data: "Analyse de la requête..." };

    // (b) Plan — determine which agents to invoke
    let plan: OrchestratorPlan;
    try {
      plan = await this.plan(userMessage);
      this.logger.debug(
        `Plan: agents=[${plan.agents.join(",")}] steps=${plan.steps.length}`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Planning failed: ${message}`);
      yield {
        type: "error",
        data: "Désolé, je n'ai pas pu analyser votre requête. Veuillez réessayer.",
      };
      yield { type: "done", data: "" };
      return;
    }

    // (c) Delegate to agents — parallel with allSettled for fault tolerance
    if (plan.steps.length > 0) {
      yield {
        type: "thinking",
        data: `Consultation de ${plan.steps.length} agent(s)...`,
      };

      const delegationPromises = plan.steps.map(async (step) => {
        try {
          // Delegate via skill execution if available, otherwise use simple classification
          const skill = this.skillRegistry.getSkill(step.query.split(" ")[0]);
          if (skill) {
            // For now, emit tool_call event to indicate delegation
            const result = await this.delegateToAgent(
              step.agent,
              step.query,
              context,
            );
            return { agent: step.agent, success: true, result };
          }
          return {
            agent: step.agent,
            success: true,
            result: `Agent ${step.agent} sollicité`,
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Agent ${step.agent} failed: ${message}`);
          return {
            agent: step.agent,
            success: false,
            error: message,
          };
        }
      });

      const results = await Promise.allSettled(delegationPromises);

      const fulfilledResults = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<unknown>).value);

      yield {
        type: "tool_result",
        data: JSON.stringify(fulfilledResults),
      };
    }

    // (d) Aggregate results via LLM
    yield { type: "thinking", data: "Synthèse des résultats..." };

    const aggregationMessages: Message[] = [
      {
        role: "system",
        content: this.orchestratorPrompt.replace(
          "{{user_message}}",
          userMessage,
        ),
      },
      {
        role: "user",
        content: `Plan d'exécution: ${JSON.stringify(plan.steps)}\n\nSynthétise une réponse en français à partir des résultats des agents.`,
      },
    ];

    // (e) Stream final response token-by-token
    try {
      const stream = this.llmProvider.streamChat(aggregationMessages);
      for await (const token of stream) {
        yield { type: "content", data: token };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Streaming aggregation failed: ${message}`);
      yield { type: "content", data: "\n\n[Synthèse non disponible]" };
    }

    // (f) Done
    yield { type: "done", data: "" };
  }

  // ── Planning ──

  async plan(userMessage: string): Promise<OrchestratorPlan> {
    const availableSkills = this.skillRegistry.listSkills();
    const skillNames = availableSkills.map((s) => s.name).join(", ");

    const planningMessages: Message[] = [
      {
        role: "system",
        content: `Tu es un planificateur de sécurité. Détermine quels agents utiliser parmi: ${skillNames || "event-search, risk-analysis, pattern-detection, incident, door-control"}.

Réponds UNIQUEMENT en JSON:
{
  "agents": ["agent_name"],
  "steps": [{"agent": "agent_name", "query": "sous-requête en français"}]
}`,
      },
      {
        role: "user",
        content: `<user_query>${userMessage}</user_query>`,
      },
    ];

    try {
      const response = await this.llmProvider.chat(planningMessages);
      const content = response.message.content;

      // Extract JSON from response
      const jsonMatch = content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          agents: Array.isArray(parsed.agents) ? parsed.agents : [],
          steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        };
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Plan parsing failed, using default: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Default plan: use event-search as fallback
    return {
      agents: ["event-search"],
      steps: [{ agent: "event-search", query: userMessage }],
    };
  }

  // ── Agent delegation helper ──

  private async delegateToAgent(
    agentName: string,
    query: string,
    context: AgentContext,
  ): Promise<string> {
    this.logger.debug(`Delegating to agent: ${agentName}`);
    // Agents are injected as NestJS providers — they'll be available after Task 3
    // For now, return a placeholder indicating agent invocation
    return `[${agentName}] consultation sur: "${query.substring(0, 50)}..."`;
  }

  // ── @OnEvent handlers per D-28 ──

  @OnEvent("incident.resolved", { async: true })
  async onIncidentResolved(payload: {
    incidentId: string;
    organizationId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      this.logger.log(
        `Auto-trigger: incident.resolved — generating summary for ${payload.incidentId}`,
      );
      // IncidentAgent.generateSummary() will be called when agents are wired in Task 3
      this.eventEmitter.emit("ai-agent.auto-summary", {
        type: "incident.resolved",
        ...payload,
      });
    } catch (err: unknown) {
      this.logger.error(
        `onIncidentResolved failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  @OnEvent("incident.escalated", { async: true })
  async onIncidentEscalated(payload: {
    incidentId: string;
    organizationId: string;
    severity: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      this.logger.log(
        `Auto-trigger: incident.escalated — interim summary for ${payload.incidentId}`,
      );
      this.eventEmitter.emit("ai-agent.auto-summary", {
        type: "incident.escalated",
        ...payload,
      });
    } catch (err: unknown) {
      this.logger.error(
        `onIncidentEscalated failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  @OnEvent("risk.score-critical", { async: true })
  async onRiskScoreCritical(payload: {
    zoneId: string;
    organizationId: string;
    score: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      this.logger.log(
        `Auto-trigger: risk.score-critical — explanation for zone ${payload.zoneId} (score: ${payload.score})`,
      );
      this.eventEmitter.emit("ai-agent.risk-explanation", {
        type: "risk.score-critical",
        ...payload,
      });
    } catch (err: unknown) {
      this.logger.error(
        `onRiskScoreCritical failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  @OnEvent("pattern.detected", { async: true })
  async onPatternDetected(payload: {
    patternId: string;
    organizationId: string;
    patternName: string;
    severity: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      this.logger.log(
        `Auto-trigger: pattern.detected — analysis for ${payload.patternId}`,
      );
      // Emit for proactive notification (further handling in Plan 05)
      this.eventEmitter.emit("ai-agent.pattern-notification", {
        type: "pattern.detected",
        ...payload,
      });
    } catch (err: unknown) {
      this.logger.error(
        `onPatternDetected failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── Private helpers ──

  private loadPrompt(filename: string): string {
    try {
      const promptPath = path.resolve(
        __dirname,
        "..",
        "prompts",
        filename,
      );
      return fs.readFileSync(promptPath, "utf-8");
    } catch {
      this.logger.warn(`Could not load prompt: ${filename}`);
      return "";
    }
  }
}
