import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createTransport, Transporter } from 'nodemailer';

export interface NotificationJobData {
  alertId: string;
  channel: 'EMAIL' | 'WEBHOOK' | 'IN_APP';
  recipient: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailTransporter: Transporter | null = null;
  private readonly notificationEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.notificationEnabled = this.config.get<string>('NOTIFICATION_ENABLED', 'true') === 'true';

    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (smtpHost) {
      this.mailTransporter = createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('SMTP transporter configured');
    } else {
      this.logger.warn('SMTP_HOST not set — email notifications disabled');
    }

    if (!this.notificationEnabled) {
      this.logger.log('Notifications globally disabled via NOTIFICATION_ENABLED=false');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Core dispatch
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Send a notification for a given alert via the specified channel.
   * Creates a NotificationLog entry and dispatches to the correct provider.
   */
  async sendNotification(alertId: string, channel: 'EMAIL' | 'WEBHOOK' | 'IN_APP', recipient: string) {
    if (!this.notificationEnabled) {
      this.logger.debug('Notifications disabled, skipping');
      return;
    }

    // Fetch the alert with camera → site context
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        camera: {
          select: { id: true, name: true, site: { select: { id: true, name: true } } },
        },
      },
    });

    if (!alert) {
      this.logger.warn(`Alert ${alertId} not found — skipping notification`);
      return;
    }

    // Create a PENDING log
    const log = await this.prisma.notificationLog.create({
      data: {
        alertId,
        channel,
        recipient,
        status: 'PENDING',
      },
    });

    try {
      const subject = `[${alert.severity}] ${alert.title}`;
      const body = this.buildEmailBody(alert);

      switch (channel) {
        case 'EMAIL':
          await this.sendEmail(recipient, subject, body);
          break;
        case 'WEBHOOK':
          await this.sendWebhook(recipient, {
            alertId: alert.id,
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            camera: alert.camera,
            snapshotUrl: alert.snapshotUrl,
            metadata: alert.metadata,
            createdAt: alert.createdAt,
          });
          break;
        case 'IN_APP':
          // IN_APP notifications are stored in the DB log only;
          // the WebSocket gateway handles real-time delivery.
          this.logger.debug(`IN_APP notification logged for ${recipient}`);
          break;
        default:
          throw new Error(`Unknown notification channel: ${channel}`);
      }

      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      this.logger.log(`Notification sent: ${channel} → ${recipient} for alert ${alertId}`);
    } catch (error: any) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: error.message ?? String(error) },
      });
      this.logger.error(`Notification failed: ${channel} → ${recipient}: ${error.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Email provider (nodemailer / SMTP)
  // ──────────────────────────────────────────────────────────────────────────────

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (!this.mailTransporter) {
      throw new Error('SMTP not configured — cannot send email');
    }

    const from = this.config.get<string>('SMTP_FROM', 'no-reply@oversight.local');

    await this.mailTransporter.sendMail({
      from,
      to,
      subject,
      html: body,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Webhook provider (HTTP POST)
  // ──────────────────────────────────────────────────────────────────────────────

  async sendWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webhook ${url} returned ${response.status}: ${text}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // BullMQ queue processor
  // ──────────────────────────────────────────────────────────────────────────────

  async processQueue(job: { data: NotificationJobData }) {
    const { alertId, channel, recipient } = job.data;
    this.logger.debug(`Processing notification job: ${channel} → ${recipient}`);
    await this.sendNotification(alertId, channel, recipient);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Settings helpers
  // ──────────────────────────────────────────────────────────────────────────────

  async getUserSettings(userId: string) {
    const settings = await this.prisma.notificationSetting.findMany({
      where: { userId },
      orderBy: { channel: 'asc' },
    });
    return settings;
  }

  async updateUserSettings(
    userId: string,
    dto: { channel: 'EMAIL' | 'WEBHOOK' | 'IN_APP'; enabled: boolean; config?: any }[],
  ) {
    // Upsert each setting
    const results = await Promise.all(
      dto.map((item) =>
        this.prisma.notificationSetting.upsert({
          where: {
            userId_channel: { userId, channel: item.channel },
          },
          create: {
            userId,
            channel: item.channel,
            enabled: item.enabled,
            config: item.config ?? {},
          },
          update: {
            enabled: item.enabled,
            config: item.config ?? {},
          },
        }),
      ),
    );
    return results;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Logs / history
  // ──────────────────────────────────────────────────────────────────────────────

  async getNotificationLogs(params: { page?: number; limit?: number; channel?: string; status?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const where: any = {};
    if (params.channel) where.channel = params.channel;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        include: { alert: { select: { id: true, title: true, severity: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Alert → notification dispatch (integration hook)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Given a newly-created alert, resolve camera → site → users and
   * enqueue notification jobs for all users who have notifications enabled.
   */
  async dispatchAlertNotifications(alertId: string) {
    if (!this.notificationEnabled) return;

    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        camera: { select: { siteId: true } },
      },
    });
    if (!alert) return;

    // Find users associated with the site, or super-admins
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { siteId: alert.camera.siteId },
          { role: 'SUPER_ADMIN' },
        ],
        isActive: true,
      },
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      this.logger.debug(`No users to notify for alert ${alertId}`);
      return;
    }

    // Get each user's notification settings
    const settings = await this.prisma.notificationSetting.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        enabled: true,
      },
    });

    // Group settings by user
    const settingsByUser = new Map<string, typeof settings>();
    for (const s of settings) {
      if (!settingsByUser.has(s.userId)) settingsByUser.set(s.userId, []);
      settingsByUser.get(s.userId)!.push(s);
    }

    const jobs: NotificationJobData[] = [];

    for (const user of users) {
      const userSettings = settingsByUser.get(user.id);

      if (!userSettings || userSettings.length === 0) {
        // Default: send IN_APP notification if no settings configured
        jobs.push({ alertId, channel: 'IN_APP', recipient: user.id });
        continue;
      }

      for (const setting of userSettings) {
        let recipient = user.id;
        if (setting.channel === 'EMAIL') {
          const config = setting.config as any;
          recipient = config?.email ?? user.email;
        } else if (setting.channel === 'WEBHOOK') {
          const config = setting.config as any;
          recipient = config?.url ?? '';
          if (!recipient) continue; // skip if no webhook URL configured
        }

        jobs.push({ alertId, channel: setting.channel as any, recipient });
      }
    }

    return jobs;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Test notification
  // ──────────────────────────────────────────────────────────────────────────────

  async sendTestNotification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const subject = '[TEST] OVERSIGHT AI — Notification Test';
    const body = `
      <h2>Notification Test</h2>
      <p>This is a test notification from OVERSIGHT AI.</p>
      <p>User: ${user.firstName} ${user.lastName} (${user.email})</p>
      <p>Time: ${new Date().toISOString()}</p>
    `;

    // Try email if SMTP is configured
    if (this.mailTransporter) {
      await this.sendEmail(user.email, subject, body);
    }

    return { success: true, message: 'Test notification dispatched' };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────────

  private buildEmailBody(alert: any): string {
    const cameraName = alert.camera?.name ?? 'Unknown';
    const siteName = alert.camera?.site?.name ?? 'Unknown';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${this.severityColor(alert.severity)};">
          🚨 [${alert.severity}] ${alert.title}
        </h2>
        <hr />
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 8px; font-weight: bold;">Camera:</td><td>${cameraName}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: bold;">Site:</td><td>${siteName}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: bold;">Severity:</td><td>${alert.severity}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: bold;">Time:</td><td>${alert.createdAt}</td></tr>
        </table>
        ${alert.description ? `<p><strong>Description:</strong> ${alert.description}</p>` : ''}
        ${alert.snapshotUrl ? `<p><img src="${alert.snapshotUrl}" alt="Alert snapshot" style="max-width: 100%;" /></p>` : ''}
        <hr />
        <p style="color: #888; font-size: 12px;">OVERSIGHT AI — Automated surveillance notification</p>
      </div>
    `;
  }

  private severityColor(severity: string): string {
    const colors: Record<string, string> = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#ca8a04',
      LOW: '#2563eb',
      INFO: '#6b7280',
    };
    return colors[severity] ?? '#6b7280';
  }
}
