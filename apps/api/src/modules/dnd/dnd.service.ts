import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DndStatus {
  active: boolean;
  currentDay: string;
  scheduleDescription: string | null;
}

@Injectable()
export class DndService {
  private readonly logger = new Logger(DndService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get the DND schedule for an organization.
   */
  async getSchedule(organizationId: string) {
    const schedule = await this.prisma.dNDSchedule.findUnique({
      where: { organizationId },
    });

    if (!schedule) {
      return {
        enabled: false,
        scheduleJson: {},
        criticalOverride: true,
      };
    }

    return schedule;
  }

  /**
   * Update the DND schedule for an organization.
   */
  async updateSchedule(
    organizationId: string,
    data: {
      enabled?: boolean;
      scheduleJson?: Record<string, { start: string; end: string } | null>;
      criticalOverride?: boolean;
    },
  ) {
    const schedule = await this.prisma.dNDSchedule.upsert({
      where: { organizationId },
      create: {
        organizationId,
        enabled: data.enabled ?? false,
        scheduleJson: data.scheduleJson ?? {},
        criticalOverride: data.criticalOverride ?? true,
      },
      update: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.scheduleJson !== undefined && { scheduleJson: data.scheduleJson }),
        ...(data.criticalOverride !== undefined && { criticalOverride: data.criticalOverride }),
      },
    });

    return schedule;
  }

  /**
   * Check if DND is currently active for the organization.
   * Evaluates current time against the schedule for today's day-of-week.
   */
  async isDndActive(organizationId: string): Promise<boolean> {
    const schedule = await this.prisma.dNDSchedule.findUnique({
      where: { organizationId },
    });

    if (!schedule || !schedule.enabled) return false;

    return this.evaluateSchedule(schedule.scheduleJson as Record<string, { start: string; end: string } | null>);
  }

  /**
   * Determine if a notification should be suppressed based on DND and severity.
   * CRITICAL alerts bypass DND (D-19).
   *
   * @returns true if the notification should be suppressed
   */
  async shouldSuppress(alertSeverity: string, organizationId: string): Promise<boolean> {
    if (alertSeverity === 'CRITICAL') {
      return false; // CRITICAL always passes through (D-19)
    }

    const schedule = await this.prisma.dNDSchedule.findUnique({
      where: { organizationId },
    });

    if (!schedule || !schedule.enabled) return false;

    // If criticalOverride is enabled and this is a CRITICAL alert, let it through
    if (schedule.criticalOverride && alertSeverity === 'CRITICAL') {
      return false;
    }

    const isActive = this.evaluateSchedule(schedule.scheduleJson as Record<string, { start: string; end: string } | null>);
    return isActive;
  }

  /**
   * Get detailed DND status including whether it's active now.
   */
  async getDndStatus(organizationId: string): Promise<DndStatus> {
    const schedule = await this.prisma.dNDSchedule.findUnique({
      where: { organizationId },
    });

    if (!schedule || !schedule.enabled) {
      return { active: false, currentDay: this.getCurrentDay(), scheduleDescription: null };
    }

    const active = this.evaluateSchedule(schedule.scheduleJson as Record<string, { start: string; end: string } | null>);
    const daySchedule = (schedule.scheduleJson as any)?.[this.getCurrentDay()];

    return {
      active,
      currentDay: this.getCurrentDay(),
      scheduleDescription: daySchedule
        ? `${daySchedule.start} - ${daySchedule.end}`
        : 'Aucune plage configurée pour aujourd\'hui',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Schedule evaluation
  // ──────────────────────────────────────────────────────────────────────────────

  private getCurrentDay(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  /**
   * Evaluate a schedule JSON to determine if DND is active right now.
   * Format: { "monday": { "start": "22:00", "end": "07:00" }, "tuesday": null, ... }
   */
  private evaluateSchedule(
    scheduleJson: Record<string, { start: string; end: string } | null>,
  ): boolean {
    const now = new Date();
    const today = this.getCurrentDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todaySchedule = scheduleJson[today];
    if (!todaySchedule) return false;

    const [startH, startM] = todaySchedule.start.split(':').map(Number);
    const [endH, endM] = todaySchedule.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range (e.g., 22:00 - 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }
}
