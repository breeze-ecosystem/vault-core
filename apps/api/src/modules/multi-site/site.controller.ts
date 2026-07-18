import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { SiteService } from "./site.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantIsolationGuard } from "../../common/guards/tenant-isolation.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { FeatureGateGuard } from "../../common/guards/feature-gate.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import { RequiresPack, RequiresModule } from "../../common/decorators/feature-gate.decorator";

@Controller("sites")
@RequiresPack("BASTION")
@UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
export class SiteController {
  constructor(private siteService: SiteService) {}

  @Get()
  @Roles("GLOBAL_ADMIN", "SUPER_ADMIN")
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.siteService.findAll({
      parentOrganizationId: user?.orgId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  @Audited({ entity: "site", action: "CREATE", captureChanges: true })
  @Roles("GLOBAL_ADMIN")
  async create(
    @Body() body: { name: string; address?: string; city?: string; country?: string },
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.siteService.create(body, user?.orgId);
  }

  @Get("aggregate")
  @Roles("GLOBAL_ADMIN", "SUPER_ADMIN")
  async getAggregateStats(@Req() req?: FastifyRequest) {
    const user = (req as any)?.user;
    return this.siteService.getAggregateStats(user?.orgId);
  }

  @Get("search")
  @Roles("GLOBAL_ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async globalSearch(
    @Query("q") q: string,
    @Query("type") type?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.siteService.globalSearch(user?.orgId, q, type);
  }

  @Get("comparison")
  @Roles("GLOBAL_ADMIN", "SUPER_ADMIN")
  async getComparison(@Req() req?: FastifyRequest) {
    const user = (req as any)?.user;
    return this.siteService.getComparison(user?.orgId);
  }

  @Get(":id")
  @Roles("GLOBAL_ADMIN", "SUPER_ADMIN", "SITE_ADMIN")
  async findById(@Param("id") id: string) {
    return this.siteService.findById(id);
  }

  @Get(":id/stats")
  @Roles("GLOBAL_ADMIN", "SUPER_ADMIN", "SITE_ADMIN")
  async getSiteStats(@Param("id") id: string) {
    return this.siteService.getSiteStats(id);
  }

  @Patch(":id")
  @Audited({ entity: "site", action: "UPDATE", captureChanges: true })
  @Roles("GLOBAL_ADMIN")
  async update(
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.siteService.update(id, body);
  }

  @Delete(":id")
  @Audited({ entity: "site", action: "DELETE" })
  @Roles("GLOBAL_ADMIN")
  async remove(@Param("id") id: string) {
    return this.siteService.remove(id);
  }
}
