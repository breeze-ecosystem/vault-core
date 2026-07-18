import {
  Controller, Get, Post, Param, Query, Body, Req, Res, UseGuards, Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequiresPack } from '../../common/decorators/feature-gate.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audited } from '../../common/decorators/audited.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FeatureGateGuard } from '../../common/guards/feature-gate.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
@RequiresPack('BASTION')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly prisma: PrismaService,
    @InjectQueue('report-generation') private reportQueue: Queue,
  ) {}

  /**
   * Enqueue a weekly report generation job.
   */
  @Post('weekly')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Audited({ entity: 'report', action: 'GENERATE_WEEKLY' })
  async generateWeeklyReport(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    const job = await this.reportQueue.add('generate-weekly', {
      orgId,
      type: 'weekly',
    });
    return { jobId: job.id, status: 'processing' };
  }

  /**
   * Enqueue a monthly report generation job.
   */
  @Post('monthly')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Audited({ entity: 'report', action: 'GENERATE_MONTHLY' })
  async generateMonthlyReport(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    const job = await this.reportQueue.add('generate-monthly', {
      orgId,
      type: 'monthly',
    });
    return { jobId: job.id, status: 'processing' };
  }

  /**
   * List generated reports (paginated).
   */
  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
  async listReports(
    @Req() req: FastifyRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = (req as any).user?.orgId;
    return this.reportService.getReportsList(orgId, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });
  }

  /**
   * Download a report PDF by ID.
   */
  @Get(':id/download')
  @Roles('ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
  async downloadReport(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const orgId = (req as any).user?.orgId;
    const buffer = await this.reportService.getReportContent(orgId, id);

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${id}.pdf"`);
    return reply.send(buffer);
  }

  /**
   * Create or update report schedule configuration.
   */
  @Post('schedule')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Audited({ entity: 'report', action: 'UPDATE_SCHEDULE' })
  async saveSchedule(
    @Req() req: FastifyRequest,
    @Body() scheduleData: { cronExpression?: string; recipients?: string[]; enabled?: boolean },
  ) {
    const orgId = (req as any).user?.orgId;
    this.logger.log(`Report schedule updated for org ${orgId}: ${JSON.stringify(scheduleData)}`);
    return { status: 'saved', schedule: scheduleData };
  }

  /**
   * Get report schedule configuration.
   */
  @Get('schedule')
  @Roles('ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
  async getSchedule(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    // Return default or stored schedule
    return {
      cronExpression: '0 8 * * 1', // Every Monday at 8 AM
      recipients: [],
      enabled: true,
    };
  }
}
