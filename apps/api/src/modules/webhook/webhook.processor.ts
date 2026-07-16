import { Logger, Inject } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WebhookService } from "./webhook.service";

/**
 * Exponential backoff schedule for webhook delivery retries (6 attempts max):
 * 0 (immediate), 60s, 300s (5m), 900s (15m), 3600s (1h), 86400s (24h)
 */
export const RETRY_SCHEDULE = [0, 60_000, 300_000, 900_000, 3_600_000, 86_400_000];

export interface WebhookJobData {
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  targetUrl: string;
  signingSecret: string;
  attemptNumber: number;
  organizationId: string;
}

@Processor("webhook-delivery")
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly webhookService: WebhookService,
    @Inject(EventEmitter2) private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData, any, string>): Promise<any> {
    const {
      subscriptionId,
      eventType,
      payload,
      targetUrl,
      signingSecret,
      attemptNumber,
      organizationId,
    } = job.data;

    const deliveryId = job.id ?? crypto.randomUUID();
    this.logger.log(
      `Webhook delivery ${deliveryId} attempt ${attemptNumber + 1}/6 → ${targetUrl} (${eventType})`,
    );

    try {
      // Sign the payload with HMAC-SHA256
      const signatureHeader = this.webhookService.signPayload(
        payload,
        signingSecret,
      );

      // POST to target URL with 30s timeout
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Id": deliveryId,
          "X-Webhook-Signature": signatureHeader,
          "X-Webhook-Event": eventType,
          "User-Agent": "OversightHub-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      // Read response body (truncated to 10KB)
      const responseText = await response.text();
      const responseBody = responseText.length > 10000
        ? responseText.slice(0, 10000) + "..."
        : responseText;

      // Log the delivery
      await this.webhookService.logDelivery({
        subscriptionId,
        eventType,
        payload,
        statusCode: response.status,
        responseBody,
        attemptNumber,
        organizationId,
        deliveryId,
      });

      if (response.ok) {
        this.logger.log(
          `Webhook ${deliveryId} delivered successfully (${response.status})`,
        );
        this.eventEmitter.emit("webhook.delivery-completed", {
          subscriptionId,
          orgId: organizationId,
          deliveryId,
          statusCode: response.status,
          eventType,
          timestamp: new Date(),
        });
        return { status: "delivered", statusCode: response.status };
      }

      // Non-OK response — retry with exponential backoff
      throw new Error(
        `HTTP ${response.status}: ${responseBody.slice(0, 200)}`,
      );
    } catch (err: any) {
      const nextAttempt = attemptNumber + 1;

      if (nextAttempt < RETRY_SCHEDULE.length) {
        // Schedule retry with exponential backoff
        const delay = RETRY_SCHEDULE[nextAttempt];
        const nextRetryAt = new Date(Date.now() + delay);

        // Log the failed attempt
        await this.webhookService.logDelivery({
          subscriptionId,
          eventType,
          payload,
          statusCode: null,
          responseBody: err.message.slice(0, 10000),
          attemptNumber,
          organizationId,
          deliveryId,
          nextRetryAt,
        });

        this.logger.warn(
          `Webhook ${deliveryId} failed (attempt ${nextAttempt}/6), retrying in ${delay}ms: ${err.message}`,
        );

        // Re-enqueue with incremented attempt number
        await job.updateData({
          ...job.data,
          attemptNumber: nextAttempt,
        });
        await job.moveToDelayed(
          Date.now() + delay,
          job.token,
        );

        return {
          status: "retrying",
          nextAttempt,
          delay,
        };
      }

      // Exhausted all retries — permanently failed
      await this.webhookService.logDelivery({
        subscriptionId,
        eventType,
        payload,
        statusCode: null,
        responseBody: err.message.slice(0, 10000),
        attemptNumber,
        organizationId,
        deliveryId,
      });

      this.logger.error(
        `Webhook ${deliveryId} permanently failed after ${RETRY_SCHEDULE.length} attempts: ${err.message}`,
      );

      this.eventEmitter.emit("webhook.delivery-failed", {
        subscriptionId,
        orgId: organizationId,
        deliveryId,
        attemptNumber: nextAttempt,
        eventType,
        error: err.message,
        timestamp: new Date(),
      });

      // Mark subscription as failed (non-blocking)
      this.webhookService
        .markSubscriptionFailed(subscriptionId)
        .catch((e) =>
          this.logger.warn(
            `Failed to mark subscription ${subscriptionId} as failed: ${e.message}`,
          ),
        );

      return {
        status: "permanently_failed",
        attempts: nextAttempt,
        error: err.message,
      };
    }
  }
}
