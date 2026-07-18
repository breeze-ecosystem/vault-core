import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BASTION_EVENT_TYPES } from "@repo/shared";
import type { AlertSeverity, Prisma } from "@prisma/client";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export interface FireAlarmPayload {
  siteId: string;
  zone: string;
  sensorId: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message?: string;
  timestamp?: string;
}

export interface BmsEventPayload {
  siteId: string;
  zone: string;
  eventType: "hvac_temperature" | "hvac_humidity" | "emergency_lighting" | "fire_door_release";
  value?: number;
  unit?: string;
  message?: string;
  timestamp?: string;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────────
  // Fire Alarm Incoming Webhook (BAS-43 / D-12)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Handle an incoming fire alarm event.
   * 1. Validates payload (already done by controller ZodValidationPipe)
   * 2. Resolves nearest camera in same site/zone
   * 3. Captures snapshot from nearest camera
   * 4. Creates CRITICAL alert
   * 5. Dispatches webhook event
   * 6. Sends Socket.IO event
   * 7. Creates/updates IntegrationEndpoint record
   */
  async handleFireAlarm(payload: FireAlarmPayload): Promise<{ alertId: string }> {
    const { siteId, zone, sensorId, severity, message, timestamp } = payload;

    // Step 2: Resolve nearest camera
    const nearestCamera = await this.resolveNearestCamera(siteId, zone);

    // Step 3: Capture snapshot if camera found
    let snapshotUrl: string | null = null;
    if (nearestCamera) {
      snapshotUrl = await this.captureSnapshot(nearestCamera.id);
    }

    // Step 5: Create CRITICAL alert
    const alertTitle = `Alarme Incendie — ${zone}`;
    const alert = await this.prisma.alert.create({
      data: {
        title: alertTitle,
        description: message || `Alarme incendie détectée par capteur ${sensorId} dans la zone ${zone}`,
        severity: "CRITICAL" as AlertSeverity,
        cameraId: nearestCamera?.id ?? (await this.getFallbackCameraId(siteId)),
        organizationId: siteId,
        snapshotUrl,
        status: "OPEN",
      },
    });

    // Step 6: Dispatch webhook
    await this.webhookService.dispatchWebhook(
      BASTION_EVENT_TYPES.FIRE_ALARM,
      siteId,
      {
        id: alert.id,
        zone,
        sensorId,
        severity,
        message: message || "",
        timestamp: timestamp || new Date().toISOString(),
        correlatedCameraId: nearestCamera?.id ?? null,
        snapshotUrl,
      },
    );

    // Step 7: Send Socket.IO event
    this.eventEmitter.emit("integration.fire_alarm", {
      alertId: alert.id,
      zone,
      severity,
      snapshotUrl,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Step 8: Update IntegrationEndpoint lastEventAt
    await this.upsertEndpointEvent(siteId, "fire_alarm");

    this.logger.log(`Fire alarm alert ${alert.id} created for zone ${zone} (sensor ${sensorId})`);

    return { alertId: alert.id };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // BMS Incoming Webhook (BAS-44 / D-14)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Handle an incoming BMS event.
   * Routes by eventType and creates alerts based on severity.
   * Event-based only — no bidirectional control (D-14).
   */
  async handleBmsEvent(payload: BmsEventPayload): Promise<{ alertId?: string }> {
    const { siteId, zone, eventType, value, unit, message, timestamp } = payload;

    // Determine alert severity based on event type (D-14)
    let alertSeverity: AlertSeverity = "INFO";
    let shouldCreateAlert = false;
    let needsVideoCorrelation = false;

    switch (eventType) {
      case "hvac_temperature":
        // If value exceeds thresholds, create WARNING alert
        if (value !== undefined) {
          if (value > 40 || value < 10) {
            alertSeverity = "HIGH";
            shouldCreateAlert = true;
          } else if (value > 35 || value < 15) {
            alertSeverity = "MEDIUM";
            shouldCreateAlert = true;
          }
        }
        break;

      case "hvac_humidity":
        if (value !== undefined && (value > 90 || value < 20)) {
          alertSeverity = "MEDIUM";
          shouldCreateAlert = true;
        }
        break;

      case "emergency_lighting":
        alertSeverity = "INFO";
        shouldCreateAlert = true;
        break;

      case "fire_door_release":
        alertSeverity = "CRITICAL";
        shouldCreateAlert = true;
        needsVideoCorrelation = true;
        break;
    }

    // For critical events: resolve nearest camera and capture snapshot
    let snapshotUrl: string | null = null;
    let nearestCameraId: string | null = null;

    if (needsVideoCorrelation) {
      const nearestCamera = await this.resolveNearestCamera(siteId, zone);
      if (nearestCamera) {
        nearestCameraId = nearestCamera.id;
        snapshotUrl = await this.captureSnapshot(nearestCamera.id);
      }
    }

    // Create alert if severity warrants
    let alertId: string | undefined;
    if (shouldCreateAlert) {
      const title = this.getBmsAlertTitle(eventType, zone, value, unit);
      const alert = await this.prisma.alert.create({
        data: {
          title,
          description: message || `Événement BMS: ${eventType} dans ${zone}${value !== undefined ? ` (${value}${unit || ""})` : ""}`,
          severity: alertSeverity,
          cameraId: nearestCameraId ?? (await this.getFallbackCameraId(siteId)),
          organizationId: siteId,
          snapshotUrl,
          status: alertSeverity === "CRITICAL" ? "OPEN" : "ACKNOWLEDGED",
        },
      });
      alertId = alert.id;

      this.logger.log(`BMS alert ${alert.id} created for ${eventType} in ${zone} (severity: ${alertSeverity})`);
    }

    // Dispatch webhook
    await this.webhookService.dispatchWebhook(
      BASTION_EVENT_TYPES.BMS_EVENT,
      siteId,
      {
        eventType,
        zone,
        value: value ?? null,
        unit: unit ?? null,
        message: message || "",
        timestamp: timestamp || new Date().toISOString(),
        alertId: alertId ?? null,
        alertSeverity: shouldCreateAlert ? alertSeverity : null,
        correlatedCameraId: nearestCameraId,
        snapshotUrl,
      },
    );

    // Send Socket.IO event
    this.eventEmitter.emit("integration.bms_event", {
      eventType,
      zone,
      value: value ?? null,
      unit: unit ?? null,
      alertId: alertId ?? null,
      severity: shouldCreateAlert ? alertSeverity : "INFO",
      timestamp: timestamp || new Date().toISOString(),
    });

    // Update IntegrationEndpoint lastEventAt
    await this.upsertEndpointEvent(siteId, "bms");

    return { alertId };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Configuration endpoints (authenticated)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * List all integration endpoints for an organization.
   */
  async listIntegrations(orgId: string) {
    return this.prisma.integrationEndpoint.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create or update an integration endpoint configuration.
   */
  async configureIntegration(
    orgId: string,
    dto: {
      type: string;
      name: string;
      config?: Record<string, unknown>;
      sharedSecret?: string;
    },
  ) {
    const secret = dto.sharedSecret || crypto.randomBytes(32).toString("hex");
    const configData: Record<string, unknown> = {
      ...(dto.config ?? {}),
      sharedSecret: secret,
    };

    const integration = await this.prisma.integrationEndpoint.upsert({
      where: {
        organizationId_type: { organizationId: orgId, type: dto.type },
      },
      create: {
        organizationId: orgId,
        type: dto.type,
        name: dto.name,
        config: configData as Prisma.InputJsonValue,
      },
      update: {
        name: dto.name,
        config: configData as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Integration ${dto.type} configured for org ${orgId}`);

    return {
      id: integration.id,
      type: integration.type,
      name: integration.name,
      sharedSecret: secret, // Returned once on creation
      isActive: integration.isActive,
      lastEventAt: integration.lastEventAt,
      createdAt: integration.createdAt,
    };
  }

  /**
   * Delete an integration endpoint.
   */
  async deleteIntegration(id: string, orgId: string) {
    const existing = await this.prisma.integrationEndpoint.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Intégration non trouvée");
    }

    await this.prisma.integrationEndpoint.delete({ where: { id } });

    this.logger.log(`Integration ${id} deleted for org ${orgId}`);
    return { success: true };
  }

  /**
   * List recent events for an integration (paginated).
   */
  async getIntegrationEvents(
    id: string,
    orgId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const existing = await this.prisma.integrationEndpoint.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Intégration non trouvée");
    }

    // Events are alerts — query by title pattern for this integration type
    const skip = (page - 1) * limit;
    const titlePrefix = existing.type === "fire_alarm" ? "Alarme Incendie" : "";

    const whereClause: Record<string, unknown> = {
      organizationId: orgId,
    };
    if (titlePrefix) {
      whereClause.title = { startsWith: titlePrefix } as any;
    } else {
      whereClause.title = { contains: "BMS" } as any;
    }

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.alert.count({ where: whereClause }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Validate incoming webhook by checking X-Integration-Key header.
   * Stores/retrieves the shared secret in the config JSON field.
   * Returns true if no secret is configured (v1 simplicity per D-12).
   */
  async validateIntegrationKey(
    orgId: string,
    type: string,
    providedKey: string | undefined,
  ): Promise<boolean> {
    const integration = await this.prisma.integrationEndpoint.findUnique({
      where: { organizationId_type: { organizationId: orgId, type } },
    });

    // If no integration configured, accept (v1 simplicity)
    if (!integration) {
      return true;
    }

    // Check if shared secret is stored in config JSON
    const config = integration.config as Record<string, unknown> | null;
    const storedSecret = config?.sharedSecret as string | undefined;

    if (!storedSecret) {
      // No secret configured, accept
      return true;
    }

    // If key provided, check it
    if (providedKey && providedKey === storedSecret) {
      return true;
    }

    // Reject if secret is configured but not provided or doesn't match
    return false;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Find the nearest camera in the same site/zone.
   * Returns the first ONLINE camera match (or null).
   */
  private async resolveNearestCamera(
    siteId: string,
    zone?: string,
  ): Promise<{ id: string; name: string; rtspUrl?: string | null } | null> {
    try {
      const whereClause: Record<string, unknown> = {
        organizationId: siteId,
        status: "ONLINE",
      };

      if (zone) {
        whereClause.name = { contains: zone } as any;
      }

      const camera = await this.prisma.camera.findFirst({
        where: whereClause,
        orderBy: { name: "asc" },
        select: { id: true, name: true, rtspUrl: true },
      });

      return camera;
    } catch (err: any) {
      this.logger.warn(`Failed to resolve nearest camera: ${err.message}`);
      return null;
    }
  }

  /**
   * Get a fallback camera ID for the org (first available camera).
   * Used when no nearest camera is found — since Alert.cameraId is required.
   */
  private async getFallbackCameraId(orgId: string): Promise<string> {
    try {
      const camera = await this.prisma.camera.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (camera) return camera.id;
    } catch {
      // ignore
    }
    // Last resort: use a dummy placeholder (will fail FK constraint if no cameras exist)
    // In practice, orgs will always have at least one camera
    // For v1: throw a descriptive error
    throw new BadRequestException(
      "Aucune caméra trouvée pour cette organisation. Veuillez d'abord configurer au moins une caméra.",
    );
  }

  /**
   * Capture a snapshot from the given camera.
   * Reuses existing snapshot capture pipeline per D-13.
   * Returns snapshot URL or null on failure.
   */
  private async captureSnapshot(cameraId: string): Promise<string | null> {
    try {
      const snapshotDir = `/mnt/snapshots`;
      fs.mkdirSync(snapshotDir, { recursive: true });

      const snapshotName = `integration_${cameraId}_${Date.now()}.jpg`;
      const snapshotPath = path.join(snapshotDir, snapshotName);

      // Attempt to capture snapshot via ffmpeg (same pattern as access.processor.ts)
      try {
        const camera = await this.prisma.camera.findUnique({
          where: { id: cameraId },
          select: { rtspUrl: true },
        });

        if (camera?.rtspUrl) {
          execSync(
            `ffmpeg -rtsp_transport tcp -i "${camera.rtspUrl}" -vframes 1 -q:v 2 "${snapshotPath}" -y`,
            { timeout: 15000, stdio: "pipe" },
          );

          if (fs.existsSync(snapshotPath)) {
            this.logger.log(`Snapshot captured for camera ${cameraId}: ${snapshotPath}`);
            return snapshotName;
          }
        }
      } catch (snapErr: any) {
        this.logger.warn(`Snapshot capture failed for camera ${cameraId}: ${snapErr.message}`);
      }

      return null;
    } catch (err: any) {
      this.logger.warn(`captureSnapshot error: ${err.message}`);
      return null;
    }
  }

  /**
   * Get a human-readable alert title for a BMS event.
   */
  private getBmsAlertTitle(
    eventType: string,
    zone: string,
    value?: number,
    unit?: string,
  ): string {
    const titles: Record<string, string> = {
      hvac_temperature: `Température anormale — ${zone}`,
      hvac_humidity: `Humidité anormale — ${zone}`,
      emergency_lighting: `Éclairage de secours activé — ${zone}`,
      fire_door_release: `Porte coupe-feu relâchée — ${zone}`,
    };

    const title = titles[eventType] || `Événement BMS — ${zone}`;
    if (value !== undefined && unit) {
      return `${title} (${value}${unit})`;
    }
    return title;
  }

  /**
   * Create or update IntegrationEndpoint lastEventAt timestamp.
   */
  private async upsertEndpointEvent(orgId: string, type: string) {
    try {
      await this.prisma.integrationEndpoint.upsert({
        where: {
          organizationId_type: { organizationId: orgId, type },
        },
        create: {
          organizationId: orgId,
          type,
          name: type === "fire_alarm" ? "Alarme Incendie" : "Gestion Technique du Bâtiment",
          config: {},
          lastEventAt: new Date(),
        },
        update: {
          lastEventAt: new Date(),
        },
      });
    } catch (err: any) {
      // Silently handle upsert errors — non-critical
      this.logger.warn(`Failed to update endpoint event: ${err.message}`);
    }
  }
}
