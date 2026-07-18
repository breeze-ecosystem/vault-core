import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportProcessor } from './report.processor';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'report-generation',
    }),
    AnalyticsModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportProcessor],
  exports: [ReportService],
})
export class ReportingModule {}
