import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../../auth/auth.service";
import { Resend } from "resend";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);
  private resend: Resend | null = null;
  private readonly emailFrom: string;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private authService: AuthService,
  ) {
    this.emailFrom = this.config.get<string>(
      "RESEND_FROM_EMAIL",
      "OVERSIGHT AI <onboarding@resend.dev>",
    );

    const resendApiKey = this.config.get<string>("RESEND_API_KEY");
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log("Resend email provider configured for invites");
    } else {
      this.logger.warn("RESEND_API_KEY not set — invite emails disabled");
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Create invite — sign JWT, persist, send email
  // ──────────────────────────────────────────────────────────────────────────────

  async createInvite(
    orgId: string,
    email: string,
    role: string,
    createdBy: string,
  ) {
    // Check for existing pending invite for this email + org
    const existingInvite = await this.prisma.invite.findFirst({
      where: { organizationId: orgId, email, status: "PENDING" },
    });

    if (existingInvite) {
      throw new ConflictException("A pending invite already exists for this email");
    }

    // Sign JWT invite token with 48h expiry (D-12)
    const token = this.jwt.sign(
      { orgId, email, role, type: "invite" },
      {
        secret: this.config.get<string>("JWT_INVITE_SECRET", "change-me-invite-secret-in-prod"),
        expiresIn: "48h",
      },
    );

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Persist invite record
    const invite = await this.prisma.invite.create({
      data: {
        organizationId: orgId,
        email,
        role: role as Role,
        token,
        createdById: createdBy,
        expiresAt,
      },
    });

    // Send invite email via Resend
    await this.sendInviteEmail(orgId, email, role, token);

    return { id: invite.id, expiresAt: invite.expiresAt };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // List invites for an organization
  // ──────────────────────────────────────────────────────────────────────────────

  async listInvites(orgId: string) {
    return this.prisma.invite.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Resend invite — re-issue JWT, update expiry, re-send email
  // ──────────────────────────────────────────────────────────────────────────────

  async resendInvite(orgId: string, inviteId: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });

    if (!invite) {
      throw new NotFoundException("Invite not found");
    }

    if (invite.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot resend — invite is ${invite.status.toLowerCase()}`,
      );
    }

    // Re-issue new JWT token
    const token = this.jwt.sign(
      { orgId, email: invite.email, role: invite.role, type: "invite" },
      {
        secret: this.config.get<string>("JWT_INVITE_SECRET", "change-me-invite-secret-in-prod"),
        expiresIn: "48h",
      },
    );

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Update token and expiry
    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { token, expiresAt },
    });

    // Re-send email
    await this.sendInviteEmail(orgId, invite.email, invite.role, token);

    return { id: invite.id, expiresAt };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Revoke invite — soft revocation (keep audit trail)
  // ──────────────────────────────────────────────────────────────────────────────

  async revokeInvite(orgId: string, inviteId: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });

    if (!invite) {
      throw new NotFoundException("Invite not found");
    }

    if (invite.status === "ACCEPTED") {
      throw new BadRequestException("Cannot revoke an already accepted invite");
    }

    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { status: "REVOKED" },
    });

    return { id: invite.id, status: "REVOKED" };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Accept invite — verify JWT, find/create user, create member, mark ACCEPTED
  // ──────────────────────────────────────────────────────────────────────────────

  async acceptInvite(
    token: string,
    password?: string,
    firstName?: string,
    lastName?: string,
  ) {
    // Verify JWT invite token (D-12)
    let payload: { orgId: string; email: string; role: string; type: string };
    try {
      payload = this.jwt.verify(token, {
        secret: this.config.get<string>("JWT_INVITE_SECRET", "change-me-invite-secret-in-prod"),
      }) as any;
    } catch {
      throw new BadRequestException("Invalid or expired invite token");
    }

    // Validate token type guard
    if (payload.type !== "invite") {
      throw new BadRequestException("Invalid invite token");
    }

    // Find the invite record by token
    const inviteRecord = await this.prisma.invite.findUnique({
      where: { token },
    });

    if (!inviteRecord) {
      throw new BadRequestException("Invite not found");
    }

    // Single-use enforcement: check not already ACCEPTED (T-04-21)
    if (inviteRecord.status === "ACCEPTED") {
      throw new ConflictException("Invite has already been accepted");
    }

    // Check if expired
    if (inviteRecord.expiresAt < new Date()) {
      throw new BadRequestException("Invite has expired");
    }

    // Find or create user (D-13: existing user auto-added)
    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      // New user — require password
      if (!password) {
        throw new BadRequestException("Password is required for new users");
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          password: hashedPassword,
          firstName: firstName ?? "",
          lastName: lastName ?? "",
        },
      });
    }

    // Check if user is already a member of this org
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: payload.orgId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException("User is already a member of this organization");
    }

    // Create OrganizationMember with invited role
    await this.prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: payload.orgId,
        role: payload.role as Role,
      },
    });

    // Mark invite as ACCEPTED (T-04-18)
    await this.prisma.invite.update({
      where: { id: inviteRecord.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    // Issue tokens via AuthService
    const tokens = await this.authService.createTokens(
      user.id,
      user.email,
      payload.orgId,
      payload.role,
    );

    // Fetch org info for response
    const org = await this.prisma.organization.findUnique({
      where: { id: payload.orgId },
      select: { id: true, name: true },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organization: org ?? { id: payload.orgId, name: "" },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Email helper
  // ──────────────────────────────────────────────────────────────────────────────

  private async sendInviteEmail(
    orgId: string,
    email: string,
    role: string,
    token: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    const orgName = org?.name ?? "an organization";
    const dashboardUrl = this.config.get<string>(
      "DASHBOARD_URL",
      "https://oversight.digitsoftafrica.com",
    );
    const inviteUrl = `${dashboardUrl}/invite/${token}`;

    if (!this.resend) {
      this.logger.warn(
        `Resend not configured — invite email not sent to ${email}. Set RESEND_API_KEY.`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to: email,
        subject: `You've been invited to join ${orgName} on Oversight Hub`,
        html: this.buildInviteEmailHtml(inviteUrl, orgName, role),
      });
      this.logger.log(`Invite email sent to ${email} for org ${orgName}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send invite email to ${email}: ${error.message}`,
      );
      // Don't throw — invite was persisted; email can be resent
    }
  }

  private buildInviteEmailHtml(
    inviteUrl: string,
    orgName: string,
    role: string,
  ): string {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background: #18181b; font-family: 'Segoe UI', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; max-width: 600px; margin: 20px auto; border-collapse: collapse;">
        <!-- Header -->
        <tr>
          <td style="background: #09090b; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; color: #fafafa; font-size: 22px;">🛡️ OVERSIGHT HUB</h1>
            <p style="margin: 4px 0 0; color: #71717a; font-size: 14px;">Invitation à rejoindre l'organisation</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="background: #18181b; padding: 30px;">
            <p style="color: #fafafa; font-size: 16px; margin: 0 0 20px;">
              Vous avez été invité à rejoindre <strong style="color: #60a5fa;">${orgName}</strong> sur Oversight Hub.
            </p>

            <table style="width: 100%; background: #27272a; border-radius: 8px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px 16px; color: #71717a; font-size: 13px; width: 100px;">Organisation</td>
                <td style="padding: 12px 16px; color: #fafafa; font-size: 14px;">${orgName}</td>
              </tr>
              <tr style="border-top: 1px solid #3f3f46;">
                <td style="padding: 12px 16px; color: #71717a; font-size: 13px;">Rôle</td>
                <td style="padding: 12px 16px; color: #fafafa; font-size: 14px;">
                  <span style="display: inline-block; padding: 2px 10px; border-radius: 4px; background: #1e3a5f; color: #93c5fd; font-size: 12px;">${roleLabel}</span>
                </td>
              </tr>
            </table>

            <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 20px;">
              Cette invitation expire dans <strong>48 heures</strong>. Cliquez sur le bouton ci-dessous pour accepter.
            </p>

            <!-- CTA Button -->
            <table style="width: 100%;">
              <tr>
                <td style="text-align: center; padding: 10px 0;">
                  <a href="${inviteUrl}"
                     style="display: inline-block; padding: 14px 40px; background: #2563eb; color: #fff;
                            text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Accepter l'invitation →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #09090b; padding: 20px 30px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; color: #52525b; font-size: 12px;">
              OVERSIGHT HUB — Physical Security Intelligence •
              <a href="${dashboardUrl}" style="color: #71717a;">Se connecter</a>
            </p>
            <p style="margin: 4px 0 0; color: #3f3f46; font-size: 11px;">
              Si vous n'avez pas demandé cette invitation, ignorez cet email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }
}
