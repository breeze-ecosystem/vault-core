import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AccessService } from "../access/access.service";
import Redis from "ioredis";

@Injectable()
export class VisitorService {
  private readonly logger = new Logger(VisitorService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private accessService: AccessService,
    @Inject("REDIS_VISITOR") private redis: Redis,
  ) {}

  // ── Lifecycle: Auto-clean expired active visits on startup ──

  async onModuleInit() {
    try {
      const expiredActiveVisits = await this.prisma.visit.findMany({
        where: {
          status: "active",
          checkedOutAt: null,
          validUntil: { lt: new Date() },
        },
        include: { credential: true },
      });

      for (const visit of expiredActiveVisits) {
        // Deactivate credential
        if (visit.credential.isActive) {
          await this.accessService.deactivateCredential(visit.credential.id);
        }
        // Add to Redis revoked set with TTL
        const remainingMs = visit.credential.validUntil
          ? new Date(visit.credential.validUntil).getTime() - Date.now()
          : 3600000;
        const ttl = Math.max(Math.ceil(remainingMs / 1000), 60);
        await this.redis.setex(
          `credential:revoked:${visit.credential.id}`,
          ttl,
          "auto-cleaned",
        );

        // Set visit as completed
        await this.prisma.visit.update({
          where: { id: visit.id },
          data: { status: "completed", checkedOutAt: visit.validUntil },
        });

        this.logger.log(`Auto-cleaned expired active visit ${visit.id}`);
      }

      if (expiredActiveVisits.length > 0) {
        this.logger.log(`Auto-cleaned ${expiredActiveVisits.length} expired active visits`);
      }
    } catch (err: any) {
      this.logger.error(`Auto-cleanup of expired visits failed: ${err.message}`);
    }
  }

  // ── Pre-registration ──

  async preregister(dto: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    company?: string;
    hostUserId: string;
    purpose?: string;
    validFrom: Date;
    validUntil: Date;
    zoneIds?: string[];
  }, userId: string) {
    // Find or create visitor record
    let visitor = await this.prisma.visitor.findFirst({
      where: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email || undefined,
      },
    });

    if (!visitor) {
      visitor = await this.prisma.visitor.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          company: dto.company ?? null,
        },
      });
    }

    // Create QR-type credential linked to the host user
    const credential = await this.accessService.createCredential({
      userId: dto.hostUserId,
      type: "QR",
      qrSeed: crypto.randomUUID(),
      validFrom: dto.validFrom.toISOString(),
      validUntil: dto.validUntil.toISOString(),
      maxUses: 0, // Unlimited during visit duration
    });

    // Create zone access levels if zone IDs provided
    if (dto.zoneIds && dto.zoneIds.length > 0) {
      // Get host user's site to find/create a 24/7 schedule
      const hostMembership = await this.prisma.organizationMember.findFirst({
        where: { userId: dto.hostUserId, isActive: true },
        select: { organizationId: true },
      });

      if (hostMembership?.organizationId) {
        // Find or create a "24/7" schedule for the site
        let schedule = await this.prisma.schedule.findFirst({
          where: {
            name: "24/7",
            zone: { organizationId: hostMembership.organizationId },
          },
        });

        if (!schedule) {
          // Get the first zone for this site to create the schedule
          const siteZone = await this.prisma.zone.findFirst({
            where: { organizationId: hostMembership.organizationId },
          });
          if (siteZone) {
            schedule = await this.accessService.createSchedule({
              name: "24/7",
              zoneId: siteZone.id,
              entries: [
                { dayOfWeek: 0, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
                { dayOfWeek: 1, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
                { dayOfWeek: 2, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
                { dayOfWeek: 3, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
                { dayOfWeek: 4, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
                { dayOfWeek: 5, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
                { dayOfWeek: 6, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
              ],
            });
          }
        }

        if (schedule) {
          for (const zoneId of dto.zoneIds) {
            try {
              await this.accessService.createAccessLevel({
                credentialId: credential.id,
                zoneId,
                scheduleId: schedule.id,
                priority: 0,
              });
            } catch (err: any) {
              this.logger.warn(`Could not create access level for zone ${zoneId}: ${err.message}`);
            }
          }
        }
      }
    }

    // Generate QR badge
    const qrResult = await this.accessService.generateQrCode(credential.id);

    // Create Visit record
    const visit = await this.prisma.visit.create({
      data: {
        visitorId: visitor.id,
        hostUserId: dto.hostUserId,
        purpose: dto.purpose ?? null,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
        credentialId: credential.id,
        status: "scheduled",
        zoneRestrictions: dto.zoneIds ? dto.zoneIds : Prisma.DbNull,
      },
      include: {
        visitor: true,
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Emit preregistered event
    this.eventEmitter.emit("visitor.preregistered", {
      visitId: visit.id,
      visitorId: visitor.id,
      visitorName: `${visitor.firstName} ${visitor.lastName}`,
      hostUserId: dto.hostUserId,
      validFrom: dto.validFrom,
      validUntil: dto.validUntil,
      timestamp: new Date(),
    });

    this.logger.log(`Visitor preregistered: ${visitor.firstName} ${visitor.lastName} (visit ${visit.id})`);

    const hostName = visit.host
      ? `${(visit as any).host.firstName} ${(visit as any).host.lastName}`
      : undefined;

    return {
      visit: {
        ...visit,
        hostName,
        zoneRestrictions: dto.zoneIds,
      },
      qrCode: qrResult.qrDataUrl,
    };
  }

  // ── Check-in ──

  async checkIn(visitId: string, userId: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { visitor: true, credential: true },
    });

    if (!visit) throw new NotFoundException("Visit not found");
    if (visit.status !== "scheduled") {
      throw new BadRequestException(`Visit cannot be checked in — current status: ${visit.status}`);
    }

    const now = new Date();
    if (now < visit.validFrom) {
      throw new BadRequestException("Visit window has not started yet");
    }
    if (now > visit.validUntil) {
      throw new BadRequestException("Visit window has expired");
    }

    // Activate the credential
    await this.accessService.updateCredential(visit.credentialId, { isActive: true });

    // Update visit
    const updated = await this.prisma.visit.update({
      where: { id: visitId },
      data: { status: "active", checkedInAt: now },
      include: {
        visitor: true,
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Emit check-in event
    this.eventEmitter.emit("visitor.checked-in", {
      visitId: visit.id,
      visitorId: visit.visitor.id,
      visitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
      hostUserId: visit.hostUserId,
      checkedInAt: now,
      timestamp: now,
    });

    this.logger.log(`Visitor checked in: ${visit.visitor.firstName} ${visit.visitor.lastName} (visit ${visitId})`);

    return {
      ...updated,
      hostName: updated.host ? `${updated.host.firstName} ${updated.host.lastName}` : undefined,
    };
  }

  // ── Check-out (Pitfall 3 mitigation: immediate credential deactivation) ──

  async checkOut(visitId: string, userId: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { visitor: true, credential: true },
    });

    if (!visit) throw new NotFoundException("Visit not found");
    if (visit.status !== "active") {
      throw new BadRequestException(`Visit cannot be checked out — current status: ${visit.status}`);
    }

    const now = new Date();

    // Immediately deactivate credential (Pitfall 3)
    if (visit.credential.isActive) {
      await this.accessService.deactivateCredential(visit.credentialId);
    }

    // Add credential ID to Redis revoked set with TTL
    const remainingMs = visit.validUntil.getTime() - now.getTime();
    const ttl = Math.max(Math.ceil(remainingMs / 1000), 60);
    await this.redis.setex(
      `credential:revoked:${visit.credentialId}`,
      ttl,
      `checked-out:${now.toISOString()}`,
    );

    // Update visit status
    const updated = await this.prisma.visit.update({
      where: { id: visitId },
      data: { status: "completed", checkedOutAt: now },
      include: {
        visitor: true,
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Emit check-out event
    this.eventEmitter.emit("visitor.checked-out", {
      visitId: visit.id,
      visitorId: visit.visitor.id,
      visitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
      hostUserId: visit.hostUserId,
      checkedOutAt: now,
      timestamp: now,
    });

    this.logger.log(`Visitor checked out: ${visit.visitor.firstName} ${visit.visitor.lastName} (visit ${visitId})`);

    return {
      ...updated,
      hostName: updated.host ? `${updated.host.firstName} ${updated.host.lastName}` : undefined,
    };
  }

  // ── Cancel Visit ──

  async cancelVisit(visitId: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { credential: true },
    });

    if (!visit) throw new NotFoundException("Visit not found");
    if (visit.status !== "scheduled") {
      throw new BadRequestException(`Cannot cancel — current status: ${visit.status}`);
    }

    // Deactivate credential
    if (visit.credential.isActive) {
      await this.accessService.deactivateCredential(visit.credentialId);
    }

    // Set remaining TTL for revoked credential
    const remainingMs = visit.validUntil.getTime() - Date.now();
    const ttl = Math.max(Math.ceil(remainingMs / 1000), 60);
    await this.redis.setex(
      `credential:revoked:${visit.credentialId}`,
      ttl,
      `cancelled:${new Date().toISOString()}`,
    );

    // Update visit
    const updated = await this.prisma.visit.update({
      where: { id: visitId },
      data: { status: "cancelled" },
      include: {
        visitor: true,
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Emit cancelled event
    this.eventEmitter.emit("visitor.cancelled", {
      visitId: visit.id,
      timestamp: new Date(),
    });

    this.logger.log(`Visit cancelled: ${visitId}`);

    return {
      ...updated,
      hostName: updated.host ? `${updated.host.firstName} ${updated.host.lastName}` : undefined,
    };
  }

  // ── List Visits ──

  async listVisits(filters: {
    status?: string;
    hostUserId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    organizationId?: string;
  }) {
    const where: Record<string, any> = {};

    if (filters.status) where.status = filters.status;
    if (filters.hostUserId) where.hostUserId = filters.hostUserId;

    // Date range filter
    if (filters.from || filters.to) {
      where.validFrom = {};
      if (filters.from) where.validFrom.gte = new Date(filters.from);
      if (filters.to) where.validFrom.lte = new Date(filters.to);
    }

    // Site scope via host user's membership
    if (filters.organizationId) {
      where.host = {
        memberships: { some: { organizationId: filters.organizationId } },
      };
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.visit.findMany({
        where,
        include: {
          visitor: true,
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
          credential: { select: { id: true, isActive: true, qrSeed: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.visit.count({ where }),
    ]);

    return {
      data: data.map((v) => ({
        ...v,
        hostName: v.host ? `${v.host.firstName} ${v.host.lastName}` : undefined,
        zoneRestrictions: v.zoneRestrictions ? JSON.parse(v.zoneRestrictions as string) : undefined,
      })),
      total,
      page,
      limit,
    };
  }

  // ── Get Single Visit ──

  async getVisit(id: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        visitor: true,
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
        credential: {
          include: {
            accessLevels: {
              include: { zone: true, schedule: true },
            },
          },
        },
      },
    });

    if (!visit) throw new NotFoundException("Visit not found");

    return {
      ...visit,
      hostName: visit.host ? `${visit.host.firstName} ${visit.host.lastName}` : undefined,
      zoneRestrictions: visit.zoneRestrictions ? JSON.parse(visit.zoneRestrictions as string) : undefined,
    };
  }

  // ── Get Single Visitor ──

  async getVisitor(id: string) {
    const visitor = await this.prisma.visitor.findUnique({
      where: { id },
      include: {
        visits: {
          include: {
            host: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!visitor) throw new NotFoundException("Visitor not found");

    return {
      ...visitor,
      visits: visitor.visits.map((v) => ({
        ...v,
        hostName: v.host ? `${v.host.firstName} ${v.host.lastName}` : undefined,
      })),
    };
  }

  // ── List Visitors ──

  async listVisitors(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Record<string, any> = {};

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    const [data, total] = await Promise.all([
      this.prisma.visitor.findMany({
        where,
        include: {
          _count: { select: { visits: true } },
          visits: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.visitor.count({ where }),
    ]);

    return {
      data: data.map((v) => ({
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        company: v.company,
        photoUrl: v.photoUrl,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        visitCount: v._count.visits,
        lastVisitDate: v.visits[0]?.createdAt.toISOString() ?? null,
      })),
      total,
      page,
      limit,
    };
  }
}
