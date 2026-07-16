import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { Resend } from "resend";
import type { ContactInput } from "@repo/shared";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private resend: Resend | null = null;
  private readonly emailFrom: string;
  private readonly notificationEmail: string;
  private readonly turnstileSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.emailFrom = this.config.get<string>(
      "RESEND_FROM_EMAIL",
      "OVERSIGHT AI <onboarding@resend.dev>",
    );
    this.notificationEmail = this.config.get<string>(
      "CONTACT_NOTIFICATION_EMAIL",
      "",
    );
    this.turnstileSecret = this.config.get<string>(
      "TURNSTILE_SECRET_KEY",
      "",
    );

    const resendApiKey = this.config.get<string>("RESEND_API_KEY");
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    }

    if (!this.turnstileSecret) {
      this.logger.warn(
        "TURNSTILE_SECRET_KEY not set — Turnstile verification will fail",
      );
    }
    if (!this.notificationEmail) {
      this.logger.warn(
        "CONTACT_NOTIFICATION_EMAIL not set — contact form email notifications disabled",
      );
    }
  }

  async handleContact(data: ContactInput): Promise<void> {
    const { name, email, company, message, turnstileToken } = data;

    // 1. Verify Turnstile token server-side
    const turnstileRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: this.turnstileSecret,
          response: turnstileToken,
        }),
      },
    );
    const turnstileData = (await turnstileRes.json()) as { success: boolean };
    if (!turnstileData.success) {
      throw new BadRequestException("Verification failed. Please try again.");
    }

    // 2. Save to database
    await this.prisma.contactSubmission.create({
      data: { name, email, company: company ?? null, message },
    });

    // 3. Send email notification via Resend
    await this.sendContactEmail(name, email, company, message);
  }

  private async sendContactEmail(
    name: string,
    email: string,
    company: string | undefined,
    message: string,
  ): Promise<void> {
    if (!this.resend || !this.notificationEmail) {
      this.logger.debug(
        "Resend not configured or no notification email — skipping contact notification",
      );
      return;
    }

    const html = `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${this.escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${this.escapeHtml(email)}">${this.escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${this.escapeHtml(company || "—")}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Message</td><td style="padding:8px;border-bottom:1px solid #eee;">${this.escapeHtml(message)}</td></tr>
      </table>
    `;

    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to: this.notificationEmail,
        subject: `New Contact: ${name}`,
        html,
      });
      this.logger.log(`Contact notification sent for ${email}`);
    } catch (err: any) {
      this.logger.error(`Failed to send contact email: ${err.message}`);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
