import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export interface NotificationPayload {
  alertId: string;
  title: string;
  description?: string;
  severity: string;
  cameraId: string;
  cameraName: string;
  snapshotUrl?: string;
}

interface FcmMessage {
  to: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  priority: "high" | "normal";
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private wsClients: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private readonly fcmServerKey: string;
  private readonly fcmWebhookUrl: string;
  private readonly fcmEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.fcmServerKey = this.config.get<string>("fcm.serverKey", "");
    this.fcmWebhookUrl = this.config.get<string>("fcm.webhookUrl", "");
    this.fcmEnabled = this.config.get<boolean>("fcm.enabled", false);

    if (this.fcmEnabled) {
      if (this.fcmServerKey) {
        this.logger.log("FCM push notifications enabled (server key mode)");
      } else if (this.fcmWebhookUrl) {
        this.logger.log(`Push notifications enabled (webhook mode: ${this.fcmWebhookUrl})`);
      }
    } else {
      this.logger.log("Push notifications disabled (no FCM_SERVER_KEY, FIREBASE_CREDENTIALS, or PUSH_WEBHOOK_URL configured)");
    }
  }

  registerClient(userId: string, socketId: string) {
    if (!this.wsClients.has(userId)) {
      this.wsClients.set(userId, new Set());
    }
    this.wsClients.get(userId)!.add(socketId);
  }

  removeClient(socketId: string) {
    for (const [userId, sockets] of this.wsClients) {
      sockets.delete(socketId);
      if (sockets.size === 0) this.wsClients.delete(userId);
    }
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.wsClients.keys());
  }

  async dispatchAlert(payload: NotificationPayload) {
    this.logger.log(`Dispatching notification for alert ${payload.alertId}`);

    // Push notifications via stored device tokens
    const tokens = await this.prisma.mobilePushToken.findMany({
      where: { user: { isActive: true } },
    });

    if (tokens.length === 0) {
      this.logger.debug("No push tokens found for notification dispatch");
      return;
    }

    for (const t of tokens) {
      try {
        await this.sendPushNotification(t.token, {
          title: `[${payload.severity}] ${payload.title}`,
          body: payload.description || `Alert from ${payload.cameraName}`,
          data: {
            alertId: payload.alertId,
            cameraId: payload.cameraId,
            severity: payload.severity,
            cameraName: payload.cameraName,
            snapshotUrl: payload.snapshotUrl || "",
          },
        });
        this.logger.debug(`Push sent to token ${t.token?.substring(0, 10)}... on ${t.platform}`);
      } catch (err: any) {
        this.logger.warn(`Failed to push to token ${t.id}: ${err.message}`);
      }
    }
  }

  /**
   * Send a push notification to a single device token.
   * Supports three modes:
   *   1. FCM Server Key → POST to https://fcm.googleapis.com/fcm/send
   *   2. Webhook URL → POST to configured PUSH_WEBHOOK_URL
   *   3. No-op if neither is configured
   */
  async sendPushNotification(
    deviceToken: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<{ success: boolean; response?: string }> {
    if (!this.fcmEnabled) {
      this.logger.debug("Push notifications disabled, skipping");
      return { success: false, response: "disabled" };
    }

    // Mode 1: FCM via server key
    if (this.fcmServerKey) {
      return this.sendViaFcm(deviceToken, payload);
    }

    // Mode 2: Generic webhook
    if (this.fcmWebhookUrl) {
      return this.sendViaWebhook(deviceToken, payload);
    }

    return { success: false, response: "no-transport-configured" };
  }

  private async sendViaFcm(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ success: boolean; response?: string }> {
    const message: FcmMessage = {
      to: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      priority: "high",
    };

    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${this.fcmServerKey}`,
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(10000),
      });

      const result = await response.json() as any;

      if (!response.ok) {
        this.logger.error(`FCM error: ${response.status} ${JSON.stringify(result)}`);
        return { success: false, response: JSON.stringify(result) };
      }

      if (result.failure === 1) {
        const error = result.results?.[0]?.error || "unknown";
        this.logger.warn(`FCM delivery failed for token: ${error}`);
        return { success: false, response: error };
      }

      return { success: true, response: result.results?.[0]?.message_id };
    } catch (err: any) {
      this.logger.error(`FCM request failed: ${err.message}`);
      return { success: false, response: err.message };
    }
  }

  private async sendViaWebhook(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ success: boolean; response?: string }> {
    try {
      const response = await fetch(this.fcmWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: deviceToken,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Webhook push error: ${response.status} ${text}`);
        return { success: false, response: text };
      }

      return { success: true, response: "webhook-accepted" };
    } catch (err: any) {
      this.logger.error(`Webhook push failed: ${err.message}`);
      return { success: false, response: err.message };
    }
  }
}
