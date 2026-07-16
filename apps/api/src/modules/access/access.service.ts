import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";
import * as qrcode from "qrcode";

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject("REDIS") private redis: Redis,
  ) {}

  // ── Credential CRUD ──

  async createCredential(dto: {
    userId: string;
    type: string;
    badgeNumber?: string;
    pinHash?: string;
    qrSeed?: string;
    validFrom?: string;
    validUntil?: string;
    maxUses?: number;
  }) {
    // Validate badgeNumber uniqueness for BADGE type
    if (dto.type === "BADGE" && dto.badgeNumber) {
      const existing = await this.prisma.credential.findUnique({
        where: { badgeNumber: dto.badgeNumber },
      });
      if (existing) {
        throw new BadRequestException("Badge number already in use");
      }
    }

    // Generate QR seed for QR type
    const qrSeed = dto.type === "QR" ? dto.qrSeed ?? crypto.randomUUID() : dto.qrSeed;

    // Resolve user's organization for the credential
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { memberships: { where: { isActive: true }, take: 1 } },
    });
    const organizationId = user?.memberships?.[0]?.organizationId;
    if (!organizationId) {
      throw new BadRequestException("User has no active organization membership");
    }

    return this.prisma.credential.create({
      data: {
        userId: dto.userId,
        type: dto.type as any,
        badgeNumber: dto.badgeNumber ?? null,
        pinHash: dto.pinHash ?? null,
        qrSeed: qrSeed ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        maxUses: dto.maxUses ?? null,
        organizationId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async listCredentials(filters?: {
    type?: string;
    userId?: string;
    isActive?: string;
    page?: number;
    limit?: number;
    organizationId?: string;
  }) {
    const where: Record<string, any> = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive === "true";
    }
    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.credential.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          accessLevels: {
            include: { zone: true, schedule: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.credential.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getCredential(id: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        accessLevels: {
          include: { zone: true, schedule: true },
        },
      },
    });
    if (!credential) throw new NotFoundException("Credential not found");
    return credential;
  }

  async updateCredential(id: string, dto: Record<string, any>) {
    await this.getCredential(id);

    // Validate badgeNumber uniqueness if changed
    if (dto.type === "BADGE" && dto.badgeNumber) {
      const existing = await this.prisma.credential.findUnique({
        where: { badgeNumber: dto.badgeNumber },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException("Badge number already in use");
      }
    }

    return this.prisma.credential.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.badgeNumber !== undefined && { badgeNumber: dto.badgeNumber }),
        ...(dto.pinHash !== undefined && { pinHash: dto.pinHash }),
        ...(dto.qrSeed !== undefined && { qrSeed: dto.qrSeed }),
        ...(dto.validFrom !== undefined && { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }),
        ...(dto.validUntil !== undefined && { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async deactivateCredential(id: string) {
    await this.getCredential(id);
    return this.prisma.credential.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async generateQrCode(credentialId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id: credentialId },
    });
    if (!credential) throw new NotFoundException("Credential not found");
    if (credential.type !== "QR") {
      throw new BadRequestException("Credential is not a QR type");
    }
    if (!credential.qrSeed) {
      throw new BadRequestException("QR credential has no QR seed");
    }

    const qrDataUrl = await qrcode.toDataURL(credential.qrSeed, {
      width: 300,
      margin: 2,
    });
    return { qrDataUrl, credentialId };
  }

  // ── Access Levels ──

  async createAccessLevel(dto: { credentialId: string; zoneId: string; scheduleId: string; priority?: number }) {
    // Validate references exist
    const [credential, zone, schedule] = await Promise.all([
      this.prisma.credential.findUnique({ where: { id: dto.credentialId } }),
      this.prisma.zone.findUnique({ where: { id: dto.zoneId } }),
      this.prisma.schedule.findUnique({ where: { id: dto.scheduleId } }),
    ]);

    if (!credential) throw new NotFoundException("Credential not found");
    if (!zone) throw new NotFoundException("Zone not found");
    if (!schedule) throw new NotFoundException("Schedule not found");

    return this.prisma.accessLevel.create({
      data: {
        credentialId: dto.credentialId,
        zoneId: dto.zoneId,
        scheduleId: dto.scheduleId,
        priority: dto.priority ?? 0,
      },
      include: { zone: true, schedule: true },
    });
  }

  async listAccessLevels(filters?: { credentialId?: string; zoneId?: string }) {
    const where: Record<string, any> = {};
    if (filters?.credentialId) where.credentialId = filters.credentialId;
    if (filters?.zoneId) where.zoneId = filters.zoneId;

    return this.prisma.accessLevel.findMany({
      where,
      include: { credential: true, zone: true, schedule: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async removeAccessLevel(id: string) {
    const level = await this.prisma.accessLevel.findUnique({ where: { id } });
    if (!level) throw new NotFoundException("Access level not found");
    return this.prisma.accessLevel.delete({ where: { id } });
  }

  // ── Schedules ──

  async createSchedule(dto: { name: string; zoneId: string; entries: any[]; holidayOverride?: string }) {
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) throw new NotFoundException("Zone not found");

    return this.prisma.schedule.create({
      data: {
        name: dto.name,
        zoneId: dto.zoneId,
        entries: dto.entries as any,
        holidayOverride: dto.holidayOverride || "none",
      },
    });
  }

  async listSchedules(filters?: { zoneId?: string }) {
    const where: Record<string, any> = {};
    if (filters?.zoneId) where.zoneId = filters.zoneId;

    return this.prisma.schedule.findMany({
      where,
      include: { zone: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateSchedule(id: string, dto: Record<string, any>) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException("Schedule not found");

    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.entries !== undefined && { entries: dto.entries as any }),
        ...(dto.holidayOverride !== undefined && { holidayOverride: dto.holidayOverride }),
      },
    });
  }

  async removeSchedule(id: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException("Schedule not found");

    // Cascade: delete associated AccessLevels
    await this.prisma.accessLevel.deleteMany({ where: { scheduleId: id } });
    return this.prisma.schedule.delete({ where: { id } });
  }

  // ── Zones ──

  async createZone(dto: { name: string; organizationId: string; description?: string }) {
    const site = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!site) throw new NotFoundException("Site not found");

    return this.prisma.zone.create({
      data: {
        name: dto.name,
        organizationId: dto.organizationId,
        description: dto.description ?? null,
      },
    });
  }

  async listZones(organizationId?: string) {
    const where: Record<string, any> = {};
    if (organizationId) where.organizationId = organizationId;

    return this.prisma.zone.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { doors: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  // ── Doors ──

  async registerDoor(dto: { name: string; organizationId: string; zoneId: string; location?: string; controllerId?: string }) {
    const [site, zone] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: dto.organizationId } }),
      this.prisma.zone.findUnique({ where: { id: dto.zoneId } }),
    ]);

    if (!site) throw new NotFoundException("Site not found");
    if (!zone) throw new NotFoundException("Zone not found");

    return this.prisma.door.create({
      data: {
        name: dto.name,
        organizationId: dto.organizationId,
        zoneId: dto.zoneId,
        location: dto.location ?? null,
        controllerId: dto.controllerId ?? null,
        alertConfig: { heldOpenThresholdMs: 30000 } as any,
      },
      include: { organization: { select: { id: true, name: true } }, zone: { select: { id: true, name: true } } },
    });
  }

  async listDoors(organizationId?: string) {
    const where: Record<string, any> = {};
    if (organizationId) where.organizationId = organizationId;

    return this.prisma.door.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        cameraMaps: { include: { camera: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
    });
  }

  // ── Camera-Door Mapping ──

  async mapCameraToDoor(dto: { cameraId: string; doorId: string; angle?: string; priority?: number }) {
    const [camera, door] = await Promise.all([
      this.prisma.camera.findUnique({ where: { id: dto.cameraId } }),
      this.prisma.door.findUnique({ where: { id: dto.doorId } }),
    ]);

    if (!camera) throw new NotFoundException("Camera not found");
    if (!door) throw new NotFoundException("Door not found");

    return this.prisma.cameraDoorMap.create({
      data: {
        cameraId: dto.cameraId,
        doorId: dto.doorId,
        angle: dto.angle ?? null,
        priority: dto.priority ?? 0,
      },
      include: {
        camera: { select: { id: true, name: true } },
        door: { select: { id: true, name: true } },
      },
    });
  }

  async removeCameraDoorMap(id: string) {
    const mapping = await this.prisma.cameraDoorMap.findUnique({ where: { id } });
    if (!mapping) throw new NotFoundException("Camera-door mapping not found");
    return this.prisma.cameraDoorMap.delete({ where: { id } });
  }

  // ── Access Evaluation (D-13: sub-100ms path) ──

  async evaluateAccess(credentialId: string, doorId: string, organizationId: string) {
    const start = Date.now();
    const now = new Date();

    // Get credential
    const credential = await this.prisma.credential.findUnique({
      where: { id: credentialId },
    });
    if (!credential || !credential.isActive) {
      return { decision: "denied", reason: "invalid-credential", timestamp: now };
    }

    // Check validity window
    if (credential.validFrom && now < credential.validFrom) {
      return { decision: "denied", reason: "not-yet-valid", timestamp: now };
    }
    if (credential.validUntil && now > credential.validUntil) {
      return { decision: "denied", reason: "expired", timestamp: now };
    }
    if (credential.maxUses && credential.useCount >= credential.maxUses) {
      return { decision: "denied", reason: "max-uses-exceeded", timestamp: now };
    }

    // Get door and zone
    const door = await this.prisma.door.findUnique({
      where: { id: doorId },
      select: { id: true, zoneId: true, organizationId: true },
    });
    if (!door) {
      return { decision: "denied", reason: "door-not-found", timestamp: now };
    }

    // D-12: Check anti-passback in Redis
    const antiPassbackViolation = await this.checkAntiPassback(credentialId, door.zoneId);
    if (antiPassbackViolation) {
      return { decision: "denied", reason: "anti-passback", timestamp: now };
    }

    // Check emergency override for the zone
    const zoneStatus = await this.redis.get(`zone:emergency:${door.zoneId}`);
    if (zoneStatus === "lockdown") {
      return { decision: "denied", reason: "zone-lockdown", timestamp: now };
    }
    if (zoneStatus === "emergency-unlock") {
      return { decision: "granted", reason: "emergency-unlock", timestamp: now };
    }

    // Cached access evaluation
    const cacheKey = `access:eval:${credentialId}:${doorId}:${now.getHours()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const decision = JSON.parse(cached);
        return { ...decision, timestamp: now };
      } catch {
        // Ignore corrupted cache
      }
    }

    // Compute: credential's access levels for the door's zone
    const accessLevels = await this.prisma.accessLevel.findMany({
      where: { credentialId, zoneId: door.zoneId },
      include: { schedule: true },
    });

    // D-10: Union of all access levels — grant if ANY level permits
    const effectiveAccess = accessLevels.some((level) =>
      this.evaluateSchedule(level.schedule, now),
    );

    const decision = {
      decision: effectiveAccess ? ("granted" as const) : ("denied" as const),
      reason: effectiveAccess ? "schedule-valid" : "no-access",
      timestamp: now,
    };

    // Cache until next hour change
    const ttl = 3600 - (now.getMinutes() * 60 + now.getSeconds());
    await this.redis.setex(cacheKey, Math.max(ttl, 60), JSON.stringify(decision));

    // Update anti-passback state on grant
    if (decision.decision === "granted") {
      await this.updateAntiPassback(credentialId, door.zoneId);
    }

    // Emit event for async processing
    this.eventEmitter.emit(
      decision.decision === "granted" ? "access.granted" : "access.denied",
      {
        credentialId: credential.id,
        userId: credential.userId,
        doorId: door.id,
        zoneId: door.zoneId,
        organizationId: door.organizationId,
        timestamp: now,
      },
    );

    const elapsed = Date.now() - start;
    if (elapsed > 50) {
      this.logger.warn(`Access decision took ${elapsed}ms (target: <100ms)`);
    }

    return decision;
  }

  // ── Private Helpers ──

  private evaluateSchedule(schedule: any, now: Date): boolean {
    const entries = schedule.entries as any[];
    if (!Array.isArray(entries) || entries.length === 0) return false;

    const dayOfWeek = now.getDay(); // 0=Sun
    const timeOfDay = now.getHours() * 60 + now.getMinutes();

    for (const entry of entries) {
      if (entry.dayOfWeek === dayOfWeek) {
        const start = entry.startHour * 60 + entry.startMinute;
        const end = entry.endHour * 60 + entry.endMinute;
        if (timeOfDay >= start && timeOfDay <= end) {
          return true;
        }
      }
    }
    return false;
  }

  private async checkAntiPassback(credentialId: string, zoneId: string): Promise<boolean> {
    try {
      const key = `antipassback:${zoneId}:${credentialId}`;
      const lastEntry = await this.redis.get(key);
      if (!lastEntry) return false;

      const elapsed = Date.now() - parseInt(lastEntry);
      if (elapsed < 30000) { // Default 30s window
        const exitKey = `antipassback:exit:${zoneId}:${credentialId}`;
        const lastExit = await this.redis.get(exitKey);
        if (!lastExit || parseInt(lastExit) < parseInt(lastEntry)) {
          return true; // Violation: re-entry without exit
        }
      }
      return false;
    } catch (err) {
      this.logger.warn(`Anti-passback check failed: ${err}`);
      return false; // Fail open on Redis errors
    }
  }

  private async updateAntiPassback(credentialId: string, zoneId: string): Promise<void> {
    try {
      const key = `antipassback:${zoneId}:${credentialId}`;
      await this.redis.set(key, String(Date.now()), "EX", 30);
    } catch (err) {
      this.logger.warn(`Anti-passback update failed: ${err}`);
    }
  }
}
