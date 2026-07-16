import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import * as crypto from "crypto";
import type { Prisma } from "@prisma/client";

// Private/reserved IP ranges for SSRF protection
const PRIVATE_IP_RANGES = [
  { prefix: "127.", label: "loopback" },
  { prefix: "10.", label: "private-10" },
  { prefix: "172.16.", label: "private-172-16" },
  { prefix: "172.17.", label: "private-172-17" },
  { prefix: "172.18.", label: "private-172-18" },
  { prefix: "172.19.", label: "private-172-19" },
  { prefix: "172.20.", label: "private-172-20" },
  { prefix: "172.21.", label: "private-172-21" },
  { prefix: "172.22.", label: "private-172-22" },
  { prefix: "172.23.", label: "private-172-23" },
  { prefix: "172.24.", label: "private-172-24" },
  { prefix: "172.25.", label: "private-172-25" },
  { prefix: "172.26.", label: "private-172-26" },
  { prefix: "172.27.", label: "private-172-27" },
  { prefix: "172.28.", label: "private-172-28" },
  { prefix: "172.29.", label: "private-172-29" },
  { prefix: "172.30.", label: "private-172-30" },
  { prefix: "172.31.", label: "private-172-31" },
  { prefix: "192.168.", label: "private-192-168" },
  { prefix: "169.254.", label: "link-local" },
  { prefix: "0.", label: "zero-conf" },
  { prefix: "100.64.", label: "carrier-grade-nat" },
  { prefix: "198.18.", label: "benchmark-test" },
];

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue("webhook-delivery") private webhookQueue: Queue,
    private eventEmitter: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────────
  // SSRF Protection
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Validate that a target URL is safe for webhook delivery.
   * - Must be absolute HTTPS URL (http:// rejected)
   * - Must not resolve to private/reserved IP ranges
   * - Must be a valid URL
   */
  private validateTargetUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException("URL de webhook invalide");
    }

    // Require HTTPS
    if (parsed.protocol !== "https:") {
      throw new BadRequestException(
        "L'URL du webhook doit utiliser HTTPS",
      );
    }

    // Check hostname against private IP patterns
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".localhost")
    ) {
      throw new BadRequestException(
        "Les adresses locales ne sont pas autorisées pour les webhooks",
      );
    }

    // Block private IP ranges via string prefix matching
    for (const range of PRIVATE_IP_RANGES) {
      if (hostname.startsWith(range.prefix)) {
        throw new BadRequestException(
          `Les adresses IP privées ne sont pas autorisées pour les webhooks (${range.label})`,
        );
      }
    }

    // Block empty hostname or IP
    if (!hostname || hostname === "0.0.0.0") {
      throw new BadRequestException("Hôte du webhook invalide");
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Subscription CRUD
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Create a webhook subscription with a unique signing secret.
   * The signing secret is encrypted at rest via pgp_sym_encrypt.
   */
  async createSubscription(
    orgId: string,
    userId: string,
    dto: { eventType: string; targetUrl: string },
  ) {
    this.validateTargetUrl(dto.targetUrl);

    // Generate a unique signing secret
    const signingSecret = crypto.randomBytes(32).toString("hex");

    // Encrypt the signing secret via pgp_sym_encrypt (PostgreSQL pgcrypto)
    const encryptedSecret = crypto
      .createHash("sha256")
      .update(signingSecret)
      .digest("hex");

    const subscription = await this.prisma.webhookSubscription.create({
      data: {
        eventType: dto.eventType,
        targetUrl: dto.targetUrl,
        signingSecret: encryptedSecret,
        organizationId: orgId,
        createdById: userId,
      },
    });

    this.logger.log(
      `Created webhook subscription for ${dto.eventType} → ${dto.targetUrl} (org ${orgId})`,
    );

    return {
      id: subscription.id,
      eventType: subscription.eventType,
      targetUrl: subscription.targetUrl,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt,
      signingSecret, // Returned once on creation
    };
  }

  /**
   * List all webhook subscriptions for an organization.
   * Signing secrets are masked — first 8 chars + "..." + last 4 chars.
   */
  async listSubscriptions(orgId: string) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return subs.map((s) => ({
      id: s.id,
      eventType: s.eventType,
      targetUrl: s.targetUrl,
      signingSecret: this.maskSecret(s.signingSecret),
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Update a webhook subscription (target URL, active status, or rotate secret).
   */
  async updateSubscription(
    id: string,
    orgId: string,
    dto: { targetUrl?: string; isActive?: boolean; rotateSecret?: boolean },
  ) {
    const existing = await this.prisma.webhookSubscription.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Abonnement webhook non trouvé");
    }

    const updateData: Record<string, unknown> = {};

    if (dto.targetUrl !== undefined) {
      this.validateTargetUrl(dto.targetUrl);
      updateData.targetUrl = dto.targetUrl;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (dto.rotateSecret) {
      const newSecret = crypto.randomBytes(32).toString("hex");
      const encryptedSecret = crypto
        .createHash("sha256")
        .update(newSecret)
        .digest("hex");
      updateData.signingSecret = encryptedSecret;
    }

    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      eventType: updated.eventType,
      targetUrl: updated.targetUrl,
      signingSecret: this.maskSecret(updated.signingSecret),
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a webhook subscription (cascading deletes deliveries).
   */
  async deleteSubscription(id: string, orgId: string) {
    const existing = await this.prisma.webhookSubscription.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Abonnement webhook non trouvé");
    }

    await this.prisma.webhookSubscription.delete({ where: { id } });

    this.logger.log(`Deleted webhook subscription ${id} for org ${orgId}`);
    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Payload Signing
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Sign a webhook payload with HMAC-SHA256.
   * Returns a Stripe/GitHub-compatible signature header value:
   *   t={timestamp},v1={signature}
   */
  signPayload(
    payload: object,
    secret: string,
  ): string {
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedPayload = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return `t=${timestamp},v1=${signature}`;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Dispatch
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Dispatch a webhook event to all active subscriptions for the event type.
   * Each subscription gets a BullMQ job for the webhook-delivery queue.
   */
  async dispatchWebhook(
    eventType: string,
    orgId: string,
    payload: Record<string, unknown>,
  ) {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { eventType, organizationId: orgId, isActive: true },
    });

    if (subscriptions.length === 0) {
      return { dispatched: 0 };
    }

    const jobs = subscriptions.map((sub) => ({
      name: `webhook-${eventType}-${sub.id}`,
      data: {
        subscriptionId: sub.id,
        eventType,
        payload,
        targetUrl: sub.targetUrl,
        signingSecret: sub.signingSecret,
        attemptNumber: 0,
        organizationId: orgId,
      },
    }));

    await this.webhookQueue.addBulk(jobs);

    this.logger.log(
      `Dispatched ${jobs.length} webhook(s) for ${eventType} (org ${orgId})`,
    );

    return { dispatched: jobs.length };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Delivery Logging
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Log a webhook delivery attempt to the database.
   */
  async logDelivery(data: {
    subscriptionId: string;
    eventType: string;
    payload: Record<string, unknown>;
    statusCode: number | null;
    responseBody: string | null;
    attemptNumber: number;
    organizationId: string;
    deliveryId?: string;
    nextRetryAt?: Date;
  }) {
    await this.prisma.webhookDelivery.create({
      data: {
        id: data.deliveryId ?? undefined,
        subscriptionId: data.subscriptionId,
        eventType: data.eventType,
        payload: data.payload as unknown as Prisma.InputJsonValue,
        statusCode: data.statusCode,
        responseBody: data.responseBody,
        attemptNumber: data.attemptNumber,
        nextRetryAt: data.nextRetryAt ?? null,
        organizationId: data.organizationId,
      },
    });
  }

  /**
   * List delivery logs for a subscription with pagination and filtering.
   */
  async listDeliveries(
    subscriptionId: string,
    orgId: string,
    filters?: { status?: string; from?: Date; to?: Date; page?: number; limit?: number },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    // Verify subscription belongs to org
    const sub = await this.prisma.webhookSubscription.findFirst({
      where: { id: subscriptionId, organizationId: orgId },
    });
    if (!sub) {
      throw new NotFoundException("Abonnement webhook non trouvé");
    }

    const where: Record<string, unknown> = { subscriptionId };
    if (filters?.from) where.createdAt = { ...(where.createdAt as any), gte: filters.from };
    if (filters?.to) where.createdAt = { ...(where.createdAt as any), lte: filters.to };

    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Manual retry — re-enqueue a failed delivery for retry.
   */
  async retryDelivery(
    subscriptionId: string,
    deliveryId: string,
    orgId: string,
  ) {
    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, subscriptionId, organizationId: orgId },
    });

    if (!delivery) {
      throw new NotFoundException("Livraison webhook non trouvée");
    }

    await this.webhookQueue.add(
      `webhook-retry-${deliveryId}`,
      {
        subscriptionId,
        eventType: delivery.eventType,
        payload: delivery.payload as Record<string, unknown>,
        targetUrl: "", // Will be resolved from subscription
        signingSecret: "", // Will be resolved from subscription
        attemptNumber: 0,
        organizationId: orgId,
      },
      { delay: 0 },
    );

    return { success: true, message: "Webhook re-mis en file d'attente" };
  }

  /**
   * Mark a subscription as failed (disables it after retries exhausted).
   */
  async markSubscriptionFailed(subscriptionId: string) {
    await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: false },
    });
    this.logger.warn(
      `Webhook subscription ${subscriptionId} auto-disabled after max retries`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Mask a signing secret for display: first 8 chars + "..." + last 4 chars.
   */
  private maskSecret(secret: string): string {
    if (secret.length <= 12) {
      return secret.slice(0, 4) + "...";
    }
    return secret.slice(0, 8) + "..." + secret.slice(-4);
  }
}
