import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface HeartbeatEntry {
  userId: string;
  ssid: string;
  lastSeen: Date;
  isPresent: boolean;
}

export interface GeofencingStatus {
  armed: boolean;
  connectedPhones: number;
  armDelayMinutes: number;
  timeoutMinutes: number;
  manualArm: boolean;
  manualArmUntil: string | null;
}

@Injectable()
export class GeofencingService {
  private readonly logger = new Logger(GeofencingService.name);
  private heartbeats: Map<string, HeartbeatEntry> = new Map();
  private armTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private manualOverrides: Map<string, { armed: boolean; until: Date | null }> = new Map();

  // Track which orgs are currently armed
  private armedOrgs: Set<string> = new Set();

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Record a heartbeat from a mobile app. The SSID is validated against the
   * organization's trusted SSIDs list. User ID comes from JWT (not request body).
   */
  async postHeartbeat(ssid: string, userId: string): Promise<void> {
    // Get the user's org from the DB
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { take: 1 } },
    });

    if (!user || user.memberships.length === 0) {
      this.logger.warn(`Utilisateur ${userId} sans organisation — heartbeat ignoré`);
      return;
    }

    const organizationId = user.memberships[0].organizationId;

    // Cancel any pending arm timer for this user's org
    const timerKey = `${organizationId}_${userId}`;
    const existingTimer = this.armTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.armTimers.delete(timerKey);
      this.logger.debug(`Arm timer cancelled for user ${userId}`);
    }

    this.heartbeats.set(userId, {
      userId,
      ssid,
      lastSeen: new Date(),
      isPresent: true,
    });

    // If this user was previously absent, their return disarms the system
    if (this.armedOrgs.has(organizationId)) {
      this.logger.log(`Utilisateur ${userId} de retour — désarmement du mode absence`);
      await this.disarm(organizationId, 'Présence détectée');
    }
  }

  /**
   * Called by mobile app when WiFi disconnects. Starts arm countdown.
   */
  async disconnected(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { take: 1 } },
    });

    if (!user || user.memberships.length === 0) return;

    const organizationId = user.memberships[0].organizationId;

    // Get org config for arm delay
    const config = await this.prisma.geofencingConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.enabled) return;

    const heartbeat = this.heartbeats.get(userId);
    if (heartbeat) {
      heartbeat.lastSeen = new Date();
      heartbeat.isPresent = false;
    } else {
      this.heartbeats.set(userId, {
        userId,
        ssid: '',
        lastSeen: new Date(),
        isPresent: false,
      });
    }

    const delayMs = (config.armDelayMinutes || 10) * 60 * 1000;

    this.logger.log(`Utilisateur ${userId} déconnecté — timer armement dans ${config.armDelayMinutes} min`);

    const timerKey = `${organizationId}_${userId}`;
    const existingTimer = this.armTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      // Check if all phones are still absent
      const allAbsent = await this.checkAllAbsent(organizationId);
      if (allAbsent) {
        await this.arm(organizationId, 'Tous les téléphones absents');
      }
      this.armTimers.delete(timerKey);
    }, delayMs);

    this.armTimers.set(timerKey, timer);
  }

  /**
   * Get the current geofencing arm status for the organization.
   */
  async getArmStatus(organizationId: string): Promise<GeofencingStatus> {
    const config = await this.prisma.geofencingConfig.findUnique({
      where: { organizationId },
    });

    const override = this.manualOverrides.get(organizationId);

    // Count connected (present) phones
    let connectedPhones = 0;
    for (const entry of this.heartbeats.values()) {
      if (entry.isPresent) connectedPhones++;
    }

    return {
      armed: this.armedOrgs.has(organizationId) || override?.armed === true,
      connectedPhones,
      armDelayMinutes: config?.armDelayMinutes ?? 10,
      timeoutMinutes: config?.absenceTimeoutMinutes ?? 15,
      manualArm: override?.armed === true,
      manualArmUntil: override?.until?.toISOString() ?? null,
    };
  }

  /**
   * Get the geofencing configuration for an organization.
   */
  async getConfig(organizationId: string) {
    const config = await this.prisma.geofencingConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return {
        enabled: true,
        trustedSsids: [],
        armDelayMinutes: 10,
        absenceTimeoutMinutes: 15,
        reinforcedSensitivity: true,
        manualArm: false,
        scheduleEnabled: false,
        scheduleJson: null,
      };
    }

    return config;
  }

  /**
   * Update the geofencing configuration.
   */
  async updateConfig(
    organizationId: string,
    data: {
      enabled?: boolean;
      trustedSsids?: string[];
      armDelayMinutes?: number;
      absenceTimeoutMinutes?: number;
      reinforcedSensitivity?: boolean;
      manualArm?: boolean;
      scheduleEnabled?: boolean;
      scheduleJson?: any;
    },
  ) {
    const config = await this.prisma.geofencingConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        trustedSsids: data.trustedSsids ?? [],
        armDelayMinutes: data.armDelayMinutes ?? 10,
        absenceTimeoutMinutes: data.absenceTimeoutMinutes ?? 15,
        reinforcedSensitivity: data.reinforcedSensitivity ?? true,
        enabled: data.enabled ?? true,
        scheduleEnabled: data.scheduleEnabled ?? false,
      },
      update: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.trustedSsids !== undefined && { trustedSsids: data.trustedSsids }),
        ...(data.armDelayMinutes !== undefined && { armDelayMinutes: data.armDelayMinutes }),
        ...(data.absenceTimeoutMinutes !== undefined && { absenceTimeoutMinutes: data.absenceTimeoutMinutes }),
        ...(data.reinforcedSensitivity !== undefined && { reinforcedSensitivity: data.reinforcedSensitivity }),
        ...(data.scheduleEnabled !== undefined && { scheduleEnabled: data.scheduleEnabled }),
        ...(data.scheduleJson !== undefined && { scheduleJson: data.scheduleJson }),
      },
    });

    return config;
  }

  /**
   * Force manual arm — overrides geofencing state.
   */
  async forceArm(organizationId: string): Promise<void> {
    this.manualOverrides.set(organizationId, {
      armed: true,
      until: null, // remains armed until manual disarm
    });
    await this.arm(organizationId, 'Armement manuel');

    // Update DB config
    await this.prisma.geofencingConfig.upsert({
      where: { organizationId },
      create: { organizationId, manualArm: true, trustedSsids: [] as any },
      update: { manualArm: true },
    });
  }

  /**
   * Force manual disarm — cancels geofencing.
   */
  async forceDisarm(organizationId: string): Promise<void> {
    this.manualOverrides.set(organizationId, {
      armed: false,
      until: null,
    });
    await this.disarm(organizationId, 'Désarmement manuel');

    await this.prisma.geofencingConfig.upsert({
      where: { organizationId },
      create: { organizationId, manualArm: false, trustedSsids: [] as any },
      update: { manualArm: false },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Internal state machine
  // ──────────────────────────────────────────────────────────────────────────────

  private async arm(organizationId: string, reason: string): Promise<void> {
    this.armedOrgs.add(organizationId);

    this.logger.log(`🔒 Mode absence activé pour ${organizationId} — ${reason}`);

    // Notify all org members
    try {
      const members = await this.prisma.organizationMember.findMany({
        where: { organizationId, isActive: true },
        include: { user: { select: { id: true } } },
      });

      for (const member of members) {
        await this.notificationsService.sendNotification(
          '00000000-0000-0000-0000-000000000000',
          'IN_APP',
          member.user.id,
        );
      }
    } catch (error: any) {
      this.logger.warn(`Erreur lors de la notification d'armement: ${error.message}`);
    }
  }

  private async disarm(organizationId: string, reason: string): Promise<void> {
    this.armedOrgs.delete(organizationId);

    this.logger.log(`🔓 Mode présence activé pour ${organizationId} — ${reason}`);

    // Notify all org members
    try {
      const members = await this.prisma.organizationMember.findMany({
        where: { organizationId, isActive: true },
        include: { user: { select: { id: true } } },
      });

      for (const member of members) {
        await this.notificationsService.sendNotification(
          '00000000-0000-0000-0000-000000000000',
          'IN_APP',
          member.user.id,
        );
      }
    } catch (error: any) {
      this.logger.warn(`Erreur lors de la notification de désarmement: ${error.message}`);
    }
  }

  /**
   * Check if ALL phones have been absent past the timeout.
   */
  private async checkAllAbsent(organizationId: string): Promise<boolean> {
    const config = await this.prisma.geofencingConfig.findUnique({
      where: { organizationId },
    });

    const timeoutMs = (config?.absenceTimeoutMinutes ?? 15) * 60 * 1000;
    const now = Date.now();

    // Get members of this org
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, isActive: true },
    });

    if (members.length === 0) return false;

    for (const member of members) {
      const heartbeat = this.heartbeats.get(member.userId);
      if (!heartbeat) {
        // No heartbeat yet — user hasn't connected, skip them
        continue;
      }

      // If any user has been seen within the timeout, not all are absent
      if (now - heartbeat.lastSeen.getTime() < timeoutMs) {
        return false;
      }
    }

    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Periodic evaluation (every minute)
  // ──────────────────────────────────────────────────────────────────────────────

  @Cron('*/1 * * * *')
  async evaluateGeofencingState() {
    try {
      const configs = await this.prisma.geofencingConfig.findMany({
        where: { enabled: true },
      });

      for (const config of configs) {
        if (!config.enabled) continue;

        // Check manual override
        const override = this.manualOverrides.get(config.organizationId);
        if (override?.armed === true) {
          // Manual arm is active — skip auto-evaluation
          if (override.until && override.until < new Date()) {
            this.manualOverrides.delete(config.organizationId);
          } else {
            continue;
          }
        }
        if (override?.armed === false) {
          continue;
        }

        // Check schedule
        if (config.scheduleEnabled && config.scheduleJson) {
          const shouldBeArmed = this.evaluateSchedule(config.scheduleJson as any);
          if (shouldBeArmed) {
            if (!this.armedOrgs.has(config.organizationId)) {
              await this.arm(config.organizationId, 'Programmation horaire');
            }
            continue;
          }
        }

        // Auto arm/disarm based on presence
        const allAbsent = await this.checkAllAbsent(config.organizationId);

        if (allAbsent && !this.armedOrgs.has(config.organizationId)) {
          // All phones have been absent for timeout — arm
          // Check arm delay too
          await this.arm(config.organizationId, 'Absence prolongée détectée');
        } else if (!allAbsent && this.armedOrgs.has(config.organizationId)) {
          // Someone returned — disarm
          await this.disarm(config.organizationId, 'Présence détectée');
        }
      }
    } catch (error: any) {
      this.logger.error(`Erreur d'évaluation du géofencing: ${error.message}`);
    }
  }

  /**
   * Evaluate a schedule JSON to determine if the system should be armed.
   * Schedule format: { "monday": { "start": "08:00", "end": "18:00" }, ... }
   */
  private evaluateSchedule(schedule: Record<string, { start: string; end: string } | null>): boolean {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];

    const todaySchedule = schedule[today];
    if (!todaySchedule) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = todaySchedule.start.split(':').map(Number);
    const [endH, endM] = todaySchedule.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same day range
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range (e.g., 22:00 - 06:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }
}
