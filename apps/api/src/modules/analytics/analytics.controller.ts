import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from './analytics.service';
import { BastionAnalyticsService } from './bastion-analytics.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresPack } from '../../common/decorators/feature-gate.decorator';
import { Audited } from '../../common/decorators/audited.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FeatureGateGuard } from '../../common/guards/feature-gate.guard';
import { analyticsQuerySchema } from '@repo/shared';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly bastionAnalyticsService: BastionAnalyticsService,
  ) {}

  // ── BASTION-specific endpoints ──

  @Get('bastion/kpis')
  @UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @RequiresPack('BASTION')
  async getBastionKpis(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    return this.bastionAnalyticsService.getBastionKpis(orgId);
  }

  @Get('bastion/trends')
  @UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @RequiresPack('BASTION')
  async getBastionTrends(
    @Req() req: FastifyRequest,
    @Query('metric') metric: string,
    @Query('days') days?: string,
  ) {
    const orgId = (req as any).user?.orgId;
    const daysNum = days ? (parseInt(days, 10) === 30 ? 30 : 7) : 7;
    return this.bastionAnalyticsService.getTrends(orgId, metric, daysNum);
  }

  @Get('bastion/search')
  @UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @RequiresPack('BASTION')
  async bastionSearch(
    @Req() req: FastifyRequest,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('siteId') siteId?: string,
    @Query('eventType') eventType?: string,
    @Query('personName') personName?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = (req as any).user?.orgId;
    return this.bastionAnalyticsService.advancedSearch(orgId, {
      dateFrom,
      dateTo,
      siteId,
      eventType,
      personName,
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });
  }

  @Get('bastion/export')
  @UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
  @Roles('ADMIN')
  @RequiresPack('BASTION')
  @Audited({ entity: 'analytics', action: 'EXPORT_BASTION_DATA' })
  async exportBastionData(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('format') format?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('siteId') siteId?: string,
    @Query('eventType') eventType?: string,
    @Query('personName') personName?: string,
  ) {
    const orgId = (req as any).user?.orgId;
    const exportFormat = format === 'pdf' ? 'pdf' : 'csv';
    const result = await this.bastionAnalyticsService.exportData(
      orgId,
      { dateFrom, dateTo, siteId, eventType, personName, page: 1, limit: 10000 },
      exportFormat,
    );

    reply.header('Content-Type', exportFormat === 'csv' ? 'text/csv' : 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);
    return reply.send(result.buffer);
  }

  @Get('zones')
  @Roles('ADMIN', 'SUPERVISOR')
  async getZoneAnalytics(
    @Query('orgId') orgId?: string,
    @Query('zoneId') zoneId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.analyticsService.getZoneAnalytics(
      orgId,
      zoneId,
      from,
      to,
      (granularity as 'hourly' | 'daily') || 'hourly',
    );
  }

  @Get('sites')
  @Roles('ADMIN', 'SUPERVISOR')
  async getSiteAnalytics(
    @Query('orgId') orgId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getSiteAnalytics(orgId, from, to);
  }

  @Get('intrusions')
  @Roles('ADMIN', 'SUPERVISOR')
  async getIntrusionEvents(
    @Query('orgId') orgId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getIntrusionEvents(orgId, from, to);
  }

  @Get('loitering')
  @Roles('ADMIN', 'SUPERVISOR')
  async getLoiteringEvents(
    @Query('orgId') orgId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getLoiteringEvents(orgId, from, to);
  }

  @Get('absence')
  @Roles('ADMIN', 'SUPERVISOR')
  async getUnusualAbsence(
    @Query('orgId') orgId?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.analyticsService.getUnusualAbsence(orgId, zoneId);
  }

  @Get('abnormal')
  @Roles('ADMIN', 'SUPERVISOR')
  async getAbnormalActivity(
    @Query('orgId') orgId?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.analyticsService.getAbnormalActivity(orgId, zoneId);
  }

  @Get('trends')
  @Roles('ADMIN', 'SUPERVISOR')
  async getAnalyticsTrends(
    @Query('orgId') orgId: string,
    @Query('metric') metric: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.analyticsService.getAnalyticsTrends(
      orgId,
      metric,
      (granularity as 'hourly' | 'daily') || 'hourly',
    );
  }
}
