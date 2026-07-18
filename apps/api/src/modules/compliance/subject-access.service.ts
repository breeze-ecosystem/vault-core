import { Injectable, Logger, BadRequestException, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WebhookService } from "../webhook/webhook.service";
import { ConfigService } from "@nestjs/config";
import { BASTION_EVENT_TYPES, type SubjectDataDto } from "@repo/shared";

@Injectable()
export class SubjectAccessService implements OnModuleDestroy {
  private readonly logger = new Logger(SubjectAccessService.name);

  /** In-memory OTP store with TTL. Maps email -> { code, expiresAt, attempts }. */
  private readonly otpStore = new Map<
    string,
    { code: string; expiresAt: Date; attempts: number }
  >();

  /** Cleanup timer reference for removing expired OTPs */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {
    // Start periodic cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanupExpiredOtps(), 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Step 1: Request OTP
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Request a 6-digit OTP for identity verification.
   * Rate-limited: one OTP per email per 60s.
   * OTP TTL: 15 minutes. Max 3 failed attempts before requiring new code.
   */
  async requestOtp(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit: check if existing OTP was generated within the last 60s
    const existing = this.otpStore.get(normalizedEmail);
    if (existing) {
      const secondsSinceLastRequest = Math.floor(
        (Date.now() - existing.expiresAt.getTime() + 15 * 60 * 1000) / 1000,
      );
      // If the OTP was created less than 60s ago, reject
      if (secondsSinceLastRequest < 60) {
        const waitSeconds = 60 - secondsSinceLastRequest;
        throw new BadRequestException(
          `Veuillez attendre ${waitSeconds} seconde(s) avant de demander un nouveau code`,
        );
      }
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store with 15-minute TTL and 0 attempts
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    this.otpStore.set(normalizedEmail, { code, expiresAt, attempts: 0 });

    // Log to audit
    await this.auditService.log({
      action: "SUBJECT_ACCESS_OTP_REQUESTED",
      entity: "subject_access",
      entityId: normalizedEmail,
    });

    // For v1: log code to console for development/testing
    this.logger.log(`[DEV] OTP for ${normalizedEmail}: ${code} (expires at ${expiresAt.toISOString()})`);

    // In production, send OTP via email/notification service
    this.logger.log(`OTP requested for ${normalizedEmail}`);

    return {
      success: true,
      message: "Un code de vérification à 6 chiffres vous a été envoyé par email",
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Step 2: Verify OTP and return subject data
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Verify the OTP and return the data subject's personal data.
   * Throws BadRequestException on invalid/expired code or max attempts exceeded.
   */
  async verifyOtp(email: string, code: string): Promise<SubjectDataDto> {
    const normalizedEmail = email.toLowerCase().trim();

    const stored = this.otpStore.get(normalizedEmail);
    if (!stored) {
      throw new BadRequestException("Aucun code de vérification trouvé. Veuillez d'abord demander un code.");
    }

    // Check expiry
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException("Code expiré. Veuillez demander un nouveau code.");
    }

    // Check max attempts
    if (stored.attempts >= 3) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException("Trop de tentatives. Veuillez demander un nouveau code.");
    }

    // Increment attempt counter
    stored.attempts += 1;

    // Verify code
    if (stored.code !== code) {
      throw new BadRequestException("Code incorrect. Veuillez réessayer.");
    }

    // Code matches — clear OTP from store
    this.otpStore.delete(normalizedEmail);

    // Gather subject data
    const subjectData = await this.gatherSubjectData(normalizedEmail);

    // Log data view to audit (BAS-35)
    await this.auditService.log({
      action: "SUBJECT_ACCESS_DATA_VIEWED",
      entity: "subject_access",
      entityId: normalizedEmail,
    });

    return subjectData;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Step 3: Submit rectification/deletion request
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Submit a subject access request (rectify or delete).
   * Creates a PENDING request that must be approved by an admin.
   */
  async submitRequest(
    email: string,
    type: "rectify" | "delete",
    details?: string,
  ): Promise<{ referenceId: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Determine organization from email — look up user record
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          take: 1,
          select: { organizationId: true },
        },
      },
    });

    const orgId = user?.memberships?.[0]?.organizationId || "unknown";

    // Create SubjectAccessRequest with PENDING status
    const shortId = Date.now().toString(36).toUpperCase();
    const referenceId = `SAR-${shortId}-${new Date().toISOString().split("T")[0]}`;

    await this.prisma.subjectAccessRequest.create({
      data: {
        organizationId: orgId,
        email: normalizedEmail,
        requestType: type === "rectify" ? "RECTIFY" : "DELETE",
        status: "PENDING",
        details,
        createdById: user?.id,
      },
    });

    // Log to audit
    await this.auditService.log({
      action: "SUBJECT_ACCESS_REQUEST_SUBMITTED",
      entity: "subject_access_request",
      entityId: referenceId,
    });

    // Dispatch webhook
    await this.webhookService.dispatchWebhook(
      BASTION_EVENT_TYPES.SUBJECT_ACCESS_REQUEST,
      orgId,
      {
        referenceId,
        email: normalizedEmail,
        requestType: type,
        timestamp: new Date().toISOString(),
      },
    );

    this.logger.log(`Subject access request ${referenceId} submitted by ${normalizedEmail} (${type})`);

    return { referenceId };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Gather all personal data associated with an email address.
   */
  private async gatherSubjectData(email: string): Promise<SubjectDataDto> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: {
              select: { name: true, displayName: true },
            },
          },
        },
      },
    });

    const name = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || email
      : email;
    const role = user?.memberships?.[0]?.role || "unknown";
    const sites =
      user?.memberships?.map((m) => m.organization.displayName || m.organization.name) ||
      [];

    // Find related Face records (by name match)
    const relatedFaces = user
      ? await this.prisma.face.count({
          where: { name: { contains: `${user.firstName} ${user.lastName}`.trim() } },
        })
      : 0;

    // Find related Alert records
    const relatedAlerts = user
      ? await this.prisma.alert.count({
          where: { title: { contains: email } },
        })
      : 0;

    // Build data items list
    const dataItems: Array<{ type: string; description: string; date: string }> = [];

    if (user) {
      // User profile data
      dataItems.push({
        type: "PROFILE",
        description: `Informations de profil: ${user.firstName || ""} ${user.lastName || ""} (${user.email})`,
        date: user.createdAt.toISOString(),
      });

      // Organization memberships
      for (const member of user.memberships) {
        dataItems.push({
          type: "MEMBERSHIP",
          description: `Membre de l'organisation: ${member.organization.displayName || member.organization.name} (rôle: ${member.role})`,
          date: member.joinedAt.toISOString(),
        });
      }
    }

    return {
      email,
      name,
      role,
      sites,
      lastAccess: new Date().toISOString(),
      relatedAlerts,
      relatedFaces,
      dataItems,
    };
  }

  /**
   * Periodically clean up expired OTPs from the in-memory store.
   * Prevents memory leak from abandoned OTP requests.
   */
  private cleanupExpiredOtps(): void {
    const now = new Date();
    let cleaned = 0;
    for (const [email, stored] of this.otpStore.entries()) {
      if (now > stored.expiresAt) {
        this.otpStore.delete(email);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired OTP(s)`);
    }
  }
}
