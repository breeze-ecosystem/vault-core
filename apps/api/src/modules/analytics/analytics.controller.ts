import { Controller, Get, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AnalyticsService } from './analytics.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { analyticsQuerySchema } from '@repo/shared';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('zones')
  @Roles('ADMIN', 'SUPERVISOR')
  async getZoneAnalytics(
    @Query('siteId') siteId?: string,
    @Query('zoneId') zoneId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.analyticsService.getZoneAnalytics(
      siteId,
      zoneId,
      from,
      to,
      (granularity as 'hourly' | 'daily') || 'hourly',
    );
  }

  @Get('sites')
  @Roles('ADMIN', 'SUPERVISOR')
  async getSiteAnalytics(
    @Query('siteId') siteId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getSiteAnalytics(siteId, from, to);
  }

  @Get('intrusions')
  @Roles('ADMIN', 'SUPERVISOR')
  async getIntrusionEvents(
    @Query('siteId') siteId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getIntrusionEvents(siteId, from, to);
  }

  @Get('loitering')
  @Roles('ADMIN', 'SUPERVISOR')
  async getLoiteringEvents(
    @Query('siteId') siteId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getLoiteringEvents(siteId, from, to);
  }

  @Get('absence')
  @Roles('ADMIN', 'SUPERVISOR')
  async getUnusualAbsence(
    @Query('siteId') siteId?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.analyticsService.getUnusualAbsence(siteId, zoneId);
  }

  @Get('abnormal')
  @Roles('ADMIN', 'SUPERVISOR')
  async getAbnormalActivity(
    @Query('siteId') siteId?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.analyticsService.getAbnormalActivity(siteId, zoneId);
  }

  @Get('trends')
  @Roles('ADMIN', 'SUPERVISOR')
  async getAnalyticsTrends(
    @Query('siteId') siteId: string,
    @Query('metric') metric: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.analyticsService.getAnalyticsTrends(
      siteId,
      metric,
      (granularity as 'hourly' | 'daily') || 'hourly',
    );
  }
}
