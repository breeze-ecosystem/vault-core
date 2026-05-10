import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Resend } from 'resend';

export interface NotificationJobData {
  alertId: string;
  channel: 'EMAIL' | 'WEBHOOK' | 'IN_APP';
  recipient: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend | null = null;
  private readonly notificationEnabled: boolean;
  private readonly emailFrom: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.notificationEnabled = this.config.get<string>('NOTIFICATION_ENABLED', 'true') === 'true';
    this.emailFrom = this.config.get<string>('RESEND_FROM_EMAIL', 'OVERSIGHT AI <onboarding@resend.dev>');

    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('Resend email provider configured');
    } else {
      this.logger.warn('RESEND_API_KEY not set — email notifications disabled');
    }

    if (!this.notificationEnabled) {
      this.logger.log('Notifications globally disabled via NOTIFICATION_ENABLED=false');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Core dispatch
  // ──────────────────────────────────────────────────────────────────────────────

  async sendNotification(alertId: string, channel: 'EMAIL' | 'WEBHOOK' | 'IN_APP', recipient: string) {
    if (!this.notificationEnabled) {
      this.logger.debug('Notifications disabled, skipping');
      return;
    }

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

    const log = await this.prisma.notificationLog.create({
      data: { alertId, channel, recipient, status: 'PENDING' },
    });

    try {
      const subject = `[${alert.severity}] ${alert.title} — ${alert.camera?.name ?? 'Camera'}`;

      switch (channel) {
        case 'EMAIL':
          await this.sendAlertEmail(recipient, subject, alert);
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
          this.logger.debug(`IN_APP notification logged for ${recipient}`);
          break;
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
  // Email provider (Resend)
  // ──────────────────────────────────────────────────────────────────────────────

  async sendAlertEmail(to: string, subject: string, alert: any): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend not configured — cannot send email. Set RESEND_API_KEY.');
    }

    const dashboardUrl = this.config.get<string>('DASHBOARD_URL', 'https://oversight.digitsoftafrica.com');
    const html = this.buildAlertEmailHtml(alert, dashboardUrl);

    // If snapshot URL exists, attach it as an inline image
    const attachments: any[] = [];
    if (alert.snapshotUrl) {
      try {
        const imageResponse = await fetch(alert.snapshotUrl, { signal: AbortSignal.timeout(10000) });
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          attachments.push({
            filename: `alert-${alert.id}.jpg`,
            content: buffer.toString('base64'),
            contentType: 'image/jpeg',
          });
        }
      } catch {
        this.logger.warn(`Could not fetch snapshot image for alert ${alert.id}`);
      }
    }

    await this.resend.emails.send({
      from: this.emailFrom,
      to,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  }

  async sendTestEmail(to: string): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend not configured — set RESEND_API_KEY env var');
    }

    const dashboardUrl = this.config.get<string>('DASHBOARD_URL', 'https://oversight.digitsoftafrica.com');

    await this.resend.emails.send({
      from: this.emailFrom,
      to,
      subject: '[TEST] OVERSIGHT AI — Notification Email',
      html: this.buildTestEmailHtml(dashboardUrl),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Webhook provider
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
    const results = await Promise.all(
      dto.map((item) =>
        this.prisma.notificationSetting.upsert({
          where: { userId_channel: { userId, channel: item.channel } },
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
  // Alert → notification dispatch
  // ──────────────────────────────────────────────────────────────────────────────

  async dispatchAlertNotifications(alertId: string) {
    if (!this.notificationEnabled) return;

    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: { camera: { select: { siteId: true } } },
    });
    if (!alert) return;

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

    const settings = await this.prisma.notificationSetting.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        enabled: true,
      },
    });

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
          if (!recipient) continue;
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

    // Get email address from notification settings (user's real email)
    const emailSetting = await this.prisma.notificationSetting.findUnique({
      where: { userId_channel: { userId, channel: 'EMAIL' } },
    });

    const config = emailSetting?.config as Record<string, any> | null;
    const recipientEmail = config?.address || user.email;

    if (this.resend) {
      await this.sendTestEmail(recipientEmail);
      return { success: true, message: `Test email sent to ${recipientEmail}` };
    }

    return { success: false, message: 'Email not configured. Set RESEND_API_KEY.' };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Email templates
  // ──────────────────────────────────────────────────────────────────────────────

  private buildAlertEmailHtml(alert: any, dashboardUrl: string): string {
    const cameraName = alert.camera?.name ?? 'Unknown';
    const siteName = alert.camera?.site?.name ?? 'Unknown';
    const severityColor = this.severityColor(alert.severity);
    const severityBg = this.severityBgColor(alert.severity);
    const time = new Date(alert.createdAt).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const snapshotSection = alert.snapshotUrl
      ? `
      <tr>
        <td style="padding: 20px 30px; text-align: center; background: #0a0a0a;">
          <p style="color: #a1a1aa; font-size: 13px; margin-bottom: 10px;">📸 SNAPSHOT</p>
          <img src="${alert.snapshotUrl}" alt="Alert snapshot"
               style="max-width: 100%; border-radius: 8px; border: 2px solid #27272a;" />
        </td>
      </tr>`
      : '';

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background: #18181b; font-family: 'Segoe UI', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; max-width: 600px; margin: 20px auto; border-collapse: collapse;">
        <!-- Header -->
        <tr>
          <td style="background: #09090b; padding: 20px 30px; border-radius: 12px 12px 0 0;">
            <table style="width: 100%;">
              <tr>
                <td>
                  <h1 style="margin: 0; color: #fafafa; font-size: 22px;">🛡️ OVERSIGHT AI</h1>
                  <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">Alerte de surveillance</p>
                </td>
                <td style="text-align: right;">
                  <span style="display: inline-block; padding: 6px 14px; border-radius: 20px;
                    background: ${severityBg}; color: ${severityColor};
                    font-size: 13px; font-weight: 600;">${alert.severity}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert title -->
        <tr>
          <td style="background: #18181b; padding: 20px 30px; border-left: 4px solid ${severityColor};">
            <h2 style="margin: 0; color: #fafafa; font-size: 18px;">${alert.title}</h2>
            ${alert.description ? `<p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">${alert.description}</p>` : ''}
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="background: #18181b; padding: 15px 30px;">
            <table style="width: 100%; background: #27272a; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 12px 16px; color: #71717a; font-size: 13px; width: 100px;">📹 Camera</td>
                <td style="padding: 12px 16px; color: #fafafa; font-size: 14px; font-weight: 500;">${cameraName}</td>
              </tr>
              <tr style="border-top: 1px solid #3f3f46;">
                <td style="padding: 12px 16px; color: #71717a; font-size: 13px;">📍 Site</td>
                <td style="padding: 12px 16px; color: #fafafa; font-size: 14px;">${siteName}</td>
              </tr>
              <tr style="border-top: 1px solid #3f3f46;">
                <td style="padding: 12px 16px; color: #71717a; font-size: 13px;">🕐 Heure</td>
                <td style="padding: 12px 16px; color: #fafafa; font-size: 14px;">${time}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Snapshot image -->
        ${snapshotSection}

        <!-- CTA button -->
        <tr>
          <td style="background: #18181b; padding: 20px 30px; text-align: center;">
            <a href="${dashboardUrl}/alertes"
               style="display: inline-block; padding: 12px 32px; background: #2563eb; color: #fff;
                      text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Voir sur le dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #09090b; padding: 15px 30px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; color: #52525b; font-size: 12px;">
              OVERSIGHT AI — Surveillance intelligente •
              <a href="${dashboardUrl}/parametres" style="color: #71717a;">Gérer les notifications</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }

  private buildTestEmailHtml(dashboardUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background: #18181b; font-family: 'Segoe UI', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; max-width: 600px; margin: 20px auto; border-collapse: collapse;">
        <tr>
          <td style="background: #09090b; padding: 30px; border-radius: 12px; text-align: center;">
            <h1 style="margin: 0; color: #fafafa; font-size: 22px;">🛡️ OVERSIGHT AI</h1>
            <p style="color: #71717a; font-size: 14px;">Test de notification</p>
          </td>
        </tr>
        <tr>
          <td style="background: #18181b; padding: 30px; text-align: center;">
            <div style="display: inline-block; padding: 16px 24px; background: #166534; border-radius: 12px; margin-bottom: 20px;">
              <p style="margin: 0; color: #4ade80; font-size: 24px;">✅ Succès !</p>
            </div>
            <p style="color: #a1a1aa; font-size: 15px;">
              Si vous recevez cet email, les notifications fonctionnent correctement.
            </p>
            <p style="color: #71717a; font-size: 13px;">
              Envoyé le ${new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background: #18181b; padding: 20px 30px; text-align: center;">
            <a href="${dashboardUrl}"
               style="display: inline-block; padding: 12px 32px; background: #2563eb; color: #fff;
                      text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Ouvrir le dashboard →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background: #09090b; padding: 15px 30px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; color: #52525b; font-size: 12px;">
              OVERSIGHT AI — Surveillance intelligente
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }

  private severityColor(severity: string): string {
    const colors: Record<string, string> = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#3b82f6',
      INFO: '#6b7280',
    };
    return colors[severity] ?? '#6b7280';
  }

  private severityBgColor(severity: string): string {
    const colors: Record<string, string> = {
      CRITICAL: '#450a0a',
      HIGH: '#431407',
      MEDIUM: '#422006',
      LOW: '#172554',
      INFO: '#1f2937',
    };
    return colors[severity] ?? '#1f2937';
  }
}
