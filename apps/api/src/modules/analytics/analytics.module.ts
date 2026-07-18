import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsGateway } from './analytics.gateway';
import { BastionAnalyticsService } from './bastion-analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, BastionAnalyticsService, AnalyticsGateway],
  exports: [AnalyticsService, BastionAnalyticsService],
})
export class AnalyticsModule {}
