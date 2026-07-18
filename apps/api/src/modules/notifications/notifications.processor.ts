import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationsService, NotificationJobData } from './notifications.service';
import { NotificationGateway } from '../notification/notification.gateway';

@Processor('notification')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private notificationsService: NotificationsService,
    private notificationGateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: { data: NotificationJobData | any; name: string }) {
    this.logger.debug(`Traitement du job de notification: ${job.name}`);

    // Handle new-style jobs (EMAIL / WEBHOOK / IN_APP / WHATSAPP / SMS / PUSH)
    if (job.data.alertId && job.data.channel && job.data.recipient) {
      await this.notificationsService.processQueue(job as { data: NotificationJobData });
      return;
    }

    // Handle legacy websocket broadcast jobs (dispatched by inference processor)
    if (job.data.type === 'websocket' && job.data.payload) {
      this.logger.debug(`Broadcasting websocket alert for ${job.data.alertId}`);
      this.notificationGateway.broadcastAlert(job.data.payload);
      return;
    }

    this.logger.warn(`Type de job de notification inconnu: ${JSON.stringify(job.data)}`);
  }
}
