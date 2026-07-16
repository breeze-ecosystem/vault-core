import { Controller, Get, Param, Query, ParseUUIDPipe, Req, Inject, Optional, Logger } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Roles } from "../../common/decorators/roles.decorator";
import { RiskService } from "./risk.service";
import type { RiskAnalysisAgent } from "../ai-agent/agents/risk-analysis.agent";
import type { AgentContext } from "../ai-agent/types/agent.types";
import type { RiskExplanation } from "../ai-agent/agents/risk-analysis.agent";

@Controller("risk")
@Roles("ADMIN", "SUPERVISOR")
export class RiskController {
  private readonly logger = new Logger(RiskController.name);

  constructor(
    private readonly riskService: RiskService,
    @Optional() @Inject("RiskAnalysisAgent") private readonly riskAgent?: RiskAnalysisAgent,
  ) {}

  /**
   * GET /api/risk/scores — Get current risk scores for all zones.
   * Optional query param: ?orgId=uuid to filter by site.
   */
  @Get("scores")
  @Roles("ADMIN", "SUPERVISOR")
  async getScores(@Query("orgId") orgId?: string) {
    return this.riskService.getCurrentScores(orgId);
  }

  /**
   * GET /api/risk/scores/:zoneId — Get current score for a specific zone.
   */
  @Get("scores/:zoneId")
  @Roles("ADMIN", "SUPERVISOR")
  async getZoneScore(@Param("zoneId", ParseUUIDPipe) zoneId: string) {
    const scores = await this.riskService.getCurrentScores();
    return scores.find((s) => s.zoneId === zoneId) ?? null;
  }

  /**
   * GET /api/risk/scores/:zoneId/history — Get trend history for a zone.
   * Query params: from (ISO datetime), to (ISO datetime).
   */
  @Get("scores/:zoneId/history")
  @Roles("ADMIN", "SUPERVISOR")
  async getZoneHistory(
    @Param("zoneId", ParseUUIDPipe) zoneId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.riskService.getZoneScoreHistory(zoneId, from, to);
  }

  /**
   * GET /api/risk/scores/:zoneId/explain — AI-powered risk score explanation.
   * Delegates to RiskAnalysisAgent.explain() for natural-language breakdown.
   * Optional ?stream=true triggers SSE streaming via the chat controller.
   */
  @Get("scores/:zoneId/explain")
  @Roles("ADMIN", "SUPERVISOR")
  async explainZoneScore(
    @Param("zoneId", ParseUUIDPipe) zoneId: string,
    @Req() req: FastifyRequest,
    @Query("stream") stream?: string,
  ): Promise<RiskExplanation | { error: string }> {
    if (!this.riskAgent) {
      return {
        error: "Agent system not available",
      } as any;
    }

    const user = (req as any).user;
    const context: AgentContext = {
      userId: user.id,
      organizationId: user.orgId,
      role: user.role,
    };

    // If stream=true, redirect to SSE endpoint (handled by chat controller)
    if (stream === "true") {
      this.logger.log(
        `SSE risk explanation requested for zone ${zoneId} — delegate to /api/ai-agent/chat`,
      );
    }

    try {
      const explanation = await this.riskAgent.explain(zoneId, context);
      return explanation;
    } catch (err: any) {
      this.logger.error(`Risk explanation failed for zone ${zoneId}: ${err.message}`);
      return {
        error: `Échec de l'explication du risque: ${err.message}`,
      } as any;
    }
  }

  /**
   * GET /api/risk/summary — Get per-site risk summaries for executive dashboard.
   */
  @Get("summary")
  @Roles("ADMIN", "SUPERVISOR")
  async getSummary() {
    return this.riskService.getSiteRiskSummaries();
  }
}
