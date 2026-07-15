import { Controller, Get, Param, Query, ParseUUIDPipe } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RiskService } from "./risk.service";

@Controller("risk")
@Roles("ADMIN", "SUPERVISOR")
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

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
   * GET /api/risk/summary — Get per-site risk summaries for executive dashboard.
   */
  @Get("summary")
  @Roles("ADMIN", "SUPERVISOR")
  async getSummary() {
    return this.riskService.getSiteRiskSummaries();
  }
}
