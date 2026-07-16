import { Controller, Post, Get, Body, Req, Logger, Inject, Optional } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AiService } from "./ai.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { aiQuerySchema, aiAssistantSchema, aiSummarizeSchema, agentChatSchema } from "@repo/shared";
import type { AIQueryInput, AIAssistantInput, AISummarizeInput, AgentChatInput } from "@repo/shared";
import type { OrchestratorService } from "../ai-agent/orchestrator.service";
import type { AgentContext } from "../ai-agent/types/agent.types";

@Controller("ai")
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    @Optional() @Inject("OrchestratorService") private readonly orchestrator?: OrchestratorService,
  ) {}

  /**
   * @deprecated Use POST /api/ai/agent-chat instead (D-27 coexistence).
   * Legacy natural language query endpoint — preserved for backward compatibility.
   */
  @Post("query")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async query(
    @Body(new ZodValidationPipe(aiQuerySchema)) body: AIQueryInput,
    @Req() req: FastifyRequest,
  ) {
    this.logger.warn(
      "[DEPRECATED] POST /api/ai/query — use POST /api/ai/agent-chat instead (D-27)",
    );
    const user = (req as any).user;
    return this.aiService.naturalLanguageQuery(body.query, user.id);
  }

  /**
   * @deprecated Use POST /api/ai/agent-chat instead (D-27 coexistence).
   * Legacy incident summary generation — preserved for backward compatibility.
   */
  @Post("summarize")
  @Roles("ADMIN", "SUPERVISOR")
  async summarize(
    @Body(new ZodValidationPipe(aiSummarizeSchema)) body: AISummarizeInput,
  ) {
    this.logger.warn(
      "[DEPRECATED] POST /api/ai/summarize — will be migrated to agent system (D-27)",
    );
    return this.aiService.generateIncidentSummary(body.incidentId);
  }

  /**
   * @deprecated Use POST /api/ai/agent-chat instead (D-27 coexistence).
   * Legacy AI assistant endpoint — preserved for backward compatibility.
   */
  @Post("assistant")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async assistant(
    @Body(new ZodValidationPipe(aiAssistantSchema)) body: AIAssistantInput,
    @Req() req: FastifyRequest,
  ) {
    this.logger.warn(
      "[DEPRECATED] POST /api/ai/assistant — use POST /api/ai/agent-chat instead (D-27)",
    );
    const user = (req as any).user;
    return this.aiService.answerQuestion(body.question, user.id);
  }

  /**
   * POST /api/ai/agent-chat — Sync fallback for agent chat.
   * Proxies to OrchestratorService.executeQuery() for non-SSE clients.
   * Protected by RBAC and rate-limit-agent.guard (D-32).
   */
  @Post("agent-chat")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async agentChat(
    @Body(new ZodValidationPipe(agentChatSchema)) body: AgentChatInput,
    @Req() req: FastifyRequest,
  ) {
    if (!this.orchestrator) {
      return {
        error: "Agent system not available",
        sessionId: null,
        response: "Le système agent n'est pas disponible actuellement.",
      };
    }

    const user = (req as any).user;
    const context: AgentContext = {
      userId: user.id,
      organizationId: user.orgId,
      role: user.role,
    };

    try {
      // Execute as async generator, collect all non-streamed results
      const generator = this.orchestrator.executeQuery(body.message, context);
      let finalContent = "";
      const toolCalls: any[] = [];

      for await (const event of generator) {
        if (event.type === "content") {
          finalContent += event.data;
        } else if (event.type === "tool_call") {
          toolCalls.push(event);
        } else if (event.type === "done") {
          finalContent = event.data || finalContent;
        }
      }

      // Generate a session ID (orchestrator handles this internally via ConversationMemory)
      const sessionId = `sync:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;

      return {
        sessionId,
        response: finalContent || "Aucune réponse générée.",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (err: any) {
      this.logger.error(`Agent chat failed: ${err.message}`);
      return {
        error: err.message || "Erreur inconnue",
        sessionId: null,
        response: "Une erreur est survenue lors du traitement de votre demande.",
      };
    }
  }

  @Get("status")
  @Roles("ADMIN")
  async status() {
    return this.aiService.checkStatus();
  }
}
