import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  Req,
  Inject,
  Optional,
  Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { FastifyRequest } from "fastify";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { patternsQuerySchema } from "@repo/shared";
import type { PatternsQueryParams } from "@repo/shared";
import { PatternsService } from "./patterns.service";
import type { PatternDetectionAgent } from "../ai-agent/agents/pattern-detection.agent";
import type { AgentContext } from "../ai-agent/types/agent.types";
import type { PatternAnalysis } from "../ai-agent/agents/pattern-detection.agent";

@Controller("patterns")
export class PatternsController {
  private readonly logger = new Logger(PatternsController.name);

  constructor(
    private readonly patternsService: PatternsService,
    @InjectQueue("recurring-patterns") private patternsQueue: Queue,
    @Optional() @Inject("PatternDetectionAgent") private readonly patternAgent?: PatternDetectionAgent,
  ) {}

  /**
   * GET /api/patterns — List detected patterns with filters.
   * Supports orgId, deviceType, severity, resolved, from, to, page, limit.
   */
  @Get()
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getPatterns(
    @Query(new ZodValidationPipe(patternsQuerySchema))
    params: PatternsQueryParams,
  ) {
    return this.patternsService.getDetectedPatterns(params);
  }

  /**
   * GET /api/patterns/definitions — Get available pattern definitions.
   */
  @Get("definitions")
  @Roles("ADMIN", "SUPERVISOR")
  async getDefinitions() {
    return this.patternsService.getPatternDefinitions();
  }

  /**
   * PATCH /api/patterns/:patternId/resolve — Mark a pattern as resolved.
   * Body: { deviceId: string }
   */
  @Patch(":patternId/resolve")
  @Roles("ADMIN", "SUPERVISOR")
  async resolvePattern(
    @Param("patternId") patternId: string,
    @Body("deviceId", ParseUUIDPipe) deviceId: string,
  ) {
    await this.patternsService.resolvePattern(patternId, deviceId);
    return { resolved: true, patternId, deviceId };
  }

  /**
   * GET /api/patterns/:patternId/analyze — AI-powered trend analysis for a detected pattern.
   * Delegates to PatternDetectionAgent.analyze() for natural-language insights.
   */
  @Get(":patternId/analyze")
  @Roles("ADMIN", "SUPERVISOR")
  async analyzePattern(
    @Param("patternId") patternId: string,
    @Req() req: FastifyRequest,
  ): Promise<PatternAnalysis | { error: string }> {
    if (!this.patternAgent) {
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

    try {
      const analysis = await this.patternAgent.analyze(patternId, context);
      if (!analysis) {
        return {
          error: `Aucune analyse disponible pour le motif ${patternId}`,
        } as any;
      }
      return analysis;
    } catch (err: any) {
      this.logger.error(`Pattern analysis failed for ${patternId}: ${err.message}`);
      return {
        error: `Échec de l'analyse du motif: ${err.message}`,
      } as any;
    }
  }

  /**
   * POST /api/patterns/detect — Manually trigger pattern detection cycle.
   * Useful for testing without waiting for the 15-minute cron interval.
   */
  @Post("detect")
  @Roles("ADMIN")
  async triggerDetection() {
    await this.patternsQueue.add("detect-patterns", {});
    return { triggered: true, message: "Pattern detection cycle triggered" };
  }
}
