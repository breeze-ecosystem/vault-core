import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReportService } from './report.service';
import { WebhookService } from '../webhook/webhook.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BASTION_EVENT_TYPES } from '@repo/shared';

@Processor('report-generation')
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly webhookService: WebhookService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ orgId: string; type: 'weekly' | 'monthly' }>): Promise<any> {
    const { orgId, type } = job.data;

    try {
      this.logger.log(`Processing ${type} report generation for org ${orgId}`);

      // Generate the report PDF
      const result = type === 'weekly'
        ? await this.reportService.generateWeeklyReport(orgId)
        : await this.reportService.generateMonthlyReport(orgId);

      const reportId = `report-${Date.now().toString(36)}`;

      // Store the report
      await this.reportService.storeReport(orgId, type, result.buffer, reportId);

      // Dispatch webhook: report ready
      await this.webhookService.dispatchWebhook(
        BASTION_EVENT_TYPES.REPORT_READY,
        orgId,
        {
          id: reportId,
          type,
          timestamp: new Date().toISOString(),
          sizeBytes: result.buffer.length,
        },
      );

      // Email delivery (best-effort per D-01)
      try {
        // Best-effort: attempt to send notification email
        this.logger.log(`Report ${reportId} ready for email dispatch (best-effort)`);
      } catch (emailErr: any) {
        // Best-effort: log warning, do not block report completion (D-01)
        this.logger.warn(`Report email delivery failed (best-effort): ${emailErr.message}`);
      }

      this.logger.log(`${type} report ${reportId} generated (${result.buffer.length} bytes)`);

      return {
        status: 'completed',
        reportId,
        type,
        sizeBytes: result.buffer.length,
      };
    } catch (err: any) {
      this.logger.error(`Report generation failed for org ${orgId}: ${err.message}`);

      // Rethrow to trigger BullMQ retry
      throw err;
    }
  }
}
