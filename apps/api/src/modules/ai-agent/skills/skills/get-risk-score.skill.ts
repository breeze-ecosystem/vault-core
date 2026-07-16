import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { Skill } from "../skill.decorator";
import { RiskAnalysisAgent } from "../../agents/risk-analysis.agent";
import { RiskService } from "../../../risk/risk.service";
import type { AgentContext } from "../../types/agent.types";

@Injectable()
@Skill({
  name: "get_risk_score",
  description:
    "Obtenir le score de risque pour une zone avec explication des facteurs contributifs",
  inputSchema: z.object({
    zone_id: z.string().uuid(),
  }),
})
export class GetRiskScoreSkill {
  private readonly logger = new Logger(GetRiskScoreSkill.name);

  constructor(
    private readonly riskAnalysisAgent: RiskAnalysisAgent,
    private readonly riskService: RiskService,
  ) {}

  async execute(
    input: { zone_id: string },
    context: AgentContext,
  ): Promise<unknown> {
    this.logger.log(`Executing get_risk_score for zone: ${input.zone_id}`);

    // Fetch current risk scores from RiskService
    let currentScores: unknown[] = [];
    try {
      currentScores = await this.riskService.getCurrentScores(
        context.organizationId,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Could not fetch risk scores: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Get AI explanation
    const explanation = await this.riskAnalysisAgent.explain(
      input.zone_id,
      context,
    );

    return {
      zoneId: input.zone_id,
      scores: currentScores,
      explanation,
    };
  }
}
