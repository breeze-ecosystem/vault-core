import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { Roles } from "../../../common/decorators/roles.decorator";
import { OrchestratorService } from "../orchestrator.service";
import { LlmProviderService } from "../llm/llm-provider.service";
import type { AgentContext } from "../types/agent.types";

@Controller("ai-agent")
export class ChatController {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly llmProvider: LlmProviderService,
  ) {}

  /**
   * SSE streaming endpoint — GET /api/ai-agent/chat?message=...
   * Uses FastifyReply for raw SSE streaming (Fastify adapter doesn't support @Sse() decorator).
   * Follows PATTERNS.md Group 5 SSE pattern.
   */
  @Get("chat")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async chat(
    @Query("message") message: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!message || message.trim().length === 0) {
      res.status(400).send({ error: "Le paramètre 'message' est requis" });
      return;
    }

    const user = (req as any).user;
    const context: AgentContext = {
      userId: user?.id || "unknown",
      organizationId: user?.orgId || "",
      role: user?.role || "VIEWER",
      language: "fr",
    };

    // Set SSE headers
    res.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.raw.write(":ok\n\n");

    try {
      const generator = this.orchestrator.executeQuery(message, context);

      for await (const event of generator) {
        const data = JSON.stringify({ type: event.type, data: event.data });
        res.raw.write(`data: ${data}\n\n`);

        // Close connection on done
        if (event.type === "done") {
          res.raw.end();
          return;
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      res.raw.write(
        `data: ${JSON.stringify({ type: "error", data: errorMessage })}\n\n`,
      );
    }

    res.raw.end();
  }

  /**
   * Agent health status — GET /api/ai-agent/status
   * Follows AiController.status() pattern.
   */
  @Get("status")
  @Roles("ADMIN")
  async status(): Promise<{
    ollamaStatus: {
      ollamaConnected: boolean;
      model: string;
      embeddingModel: string;
    };
    agentsAvailable: string[];
    skillsRegistered: number;
  }> {
    const ollamaStatus = await this.llmProvider.checkStatus();

    return {
      ollamaStatus,
      agentsAvailable: [
        "event-search",
        "risk-analysis",
        "pattern-detection",
        "incident",
        "door-control",
      ],
      skillsRegistered: 0, // Will be populated once skills are registered in Task 3
    };
  }
}
