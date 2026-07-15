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
