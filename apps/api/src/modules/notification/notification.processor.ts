import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { NotificationGateway } from "./notification.gateway";
import { NotificationPayload } from "./notification.service";

/**
 * Legacy processor for websocket-only notification jobs.
 * The new NotificationsModule also registers a processor on the same queue
 * and handles both legacy (websocket) and new (EMAIL/WEBHOOK/IN_APP) jobs.
 * 
 * This processor is kept for backward compatibility but the new NotificationsProcessor
 * takes priority for jobs with { channel, recipient } shape.
 */
@Processor("notification")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private gateway: NotificationGateway) {
    super();
  }

  async process(job: { data: { alertId: string; type: string; payload: NotificationPayload }; name: string }) {
    const { type, payload } = job.data;
    this.logger.debug(`Processing notification: ${type} for alert ${payload.alertId}`);

    if (type === "websocket") {
      this.gateway.broadcastAlert(payload as any);
    }
  }
}
