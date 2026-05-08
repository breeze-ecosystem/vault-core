import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationsService, NotificationJobData } from './notifications.service';

@Processor('notification')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private notificationsService: NotificationsService) {
    super();
  }

  async process(job: { data: NotificationJobData | any; name: string }) {
    this.logger.debug(`Processing notification job: ${job.name}`);

    // Handle new-style jobs from the notifications module
    if (job.data.alertId && job.data.channel && job.data.recipient) {
      await this.notificationsService.processQueue(job as { data: NotificationJobData });
      return;
    }

    // Handle legacy jobs from the original notification module (websocket broadcasts, etc.)
    // These are still dispatched by the inference processor
    this.logger.debug(`Legacy notification job received: ${JSON.stringify(job.data)}`);
  }
}
