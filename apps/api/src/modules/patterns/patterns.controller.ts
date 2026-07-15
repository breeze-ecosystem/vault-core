import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { patternsQuerySchema } from "@repo/shared";
import type { PatternsQueryParams } from "@repo/shared";
import { PatternsService } from "./patterns.service";

@Controller("patterns")
export class PatternsController {
  constructor(
    private readonly patternsService: PatternsService,
    @InjectQueue("recurring-patterns") private patternsQueue: Queue,
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
