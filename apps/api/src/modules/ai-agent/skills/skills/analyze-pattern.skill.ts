import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { Skill } from "../skill.decorator";
import { PatternDetectionAgent } from "../../agents/pattern-detection.agent";
import type { AgentContext } from "../../types/agent.types";

@Injectable()
@Skill({
  name: "analyze_pattern",
  description:
    "Analyser un motif de sécurité récurrent avec tendances et recommandations",
  inputSchema: z.object({
    pattern_id: z.string().uuid(),
    days: z.number().optional().default(30),
  }),
})
export class AnalyzePatternSkill {
  private readonly logger = new Logger(AnalyzePatternSkill.name);

  constructor(
    private readonly patternDetectionAgent: PatternDetectionAgent,
  ) {}

  async execute(
    input: { pattern_id: string; days?: number },
    context: AgentContext,
  ): Promise<unknown> {
    this.logger.log(
      `Executing analyze_pattern for pattern: ${input.pattern_id}`,
    );

    const analysis = await this.patternDetectionAgent.analyze(
      input.pattern_id,
      context,
    );

    return {
      patternId: input.pattern_id,
      analysis,
      periodDays: input.days || 30,
    };
  }
}
