import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * List child sites for a parent organization (paginated).
   */
  async findAll(filters?: {
    parentOrganizationId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.OrganizationWhereInput = {};
    if (filters?.parentOrganizationId) {
      where.parentOrganizationId = filters.parentOrganizationId;
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { cameras: true, doors: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Find a single site by ID with child relation info.
   */
  async findById(id: string) {
    const site = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { cameras: true, doors: true, members: true, alerts: true, faces: true, zones: true } },
        parent: { select: { id: true, name: true } },
      },
    });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  /**
   * Create a child site under a parent organization.
   * Validates maxSites limit from license claims.
   */
  async create(
    dto: { name: string; address?: string; city?: string; country?: string },
    parentOrgId: string,
  ) {
    // Validate parent organization exists and get maxSites
    const parentOrg = await this.prisma.organization.findUnique({
      where: { id: parentOrgId },
      select: { maxSites: true },
    });
    if (!parentOrg) {
      throw new NotFoundException("Parent organization not found");
    }

    // Check maxSites limit
    const childCount = await this.prisma.organization.count({
      where: { parentOrganizationId: parentOrgId, isActive: true },
    });

    if (childCount >= parentOrg.maxSites) {
      throw new ForbiddenException(
        `Site limit reached (max ${parentOrg.maxSites} sites)`,
      );
    }

    // Create child organization with parentOrganizationId set
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        address: dto.address ?? null,
        city: dto.city ?? null,
        country: dto.country ?? "SN",
        parentOrganizationId: parentOrgId,
      },
      include: {
        _count: { select: { cameras: true, doors: true, members: true } },
      },
    });
  }

  /**
   * Update a child site.
   */
  async update(id: string, dto: { name?: string; address?: string; city?: string; country?: string }) {
    const site = await this.prisma.organization.findUnique({ where: { id } });
    if (!site) throw new NotFoundException("Site not found");

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
      },
    });
  }

  /**
   * Deactivate a child site (soft delete).
   */
  async remove(id: string) {
    const site = await this.prisma.organization.findUnique({ where: { id } });
    if (!site) throw new NotFoundException("Site not found");

    return this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Aggregate KPI across all child sites (BAS-15).
   * Returns total cameras, active alerts, storage usage, average uptime, per-site breakdown.
   */
  async getAggregateStats(parentOrgId: string) {
    const children = await this.prisma.organization.findMany({
      where: { parentOrganizationId: parentOrgId, isActive: true },
      include: {
        _count: { select: { cameras: true, doors: true, members: true } },
      },
    });

    const childIds = children.map((c) => c.id);

    // Aggregate active alerts across child orgs
    const activeAlertsCount = childIds.length > 0
      ? await this.prisma.alert.count({
          where: {
            organizationId: { in: childIds },
            status: "OPEN",
          },
        })
      : 0;

    // Total cameras and online cameras aggregate
    const camerasByOrg: Array<{ organizationId: string; total: bigint; online: bigint }> =
      childIds.length > 0
        ? await this.prisma.$queryRaw`
            SELECT
              c."organizationId",
              COUNT(*)::bigint as total,
              COUNT(*) FILTER (WHERE c.status = 'ONLINE')::bigint as online
            FROM "Camera" c
            WHERE c."organizationId" = ANY(${childIds}::uuid[])
            GROUP BY c."organizationId"
          `
        : [];

    const cameraTotals = camerasByOrg.reduce(
      (acc, row) => ({
        total: acc.total + Number(row.total),
        online: acc.online + Number(row.online),
      }),
      { total: 0, online: 0 },
    );

    // Average uptime (percentage of cameras online)
    const avgUptime = cameraTotals.total > 0
      ? Math.round((cameraTotals.online / cameraTotals.total) * 100)
      : 0;

    // Per-site breakdown
    const perSite = children.map((child) => {
      const camStats = camerasByOrg.find((c) => c.organizationId === child.id);
      return {
        id: child.id,
        name: child.name,
        city: child.city,
        cameras: child._count.cameras,
        camerasOnline: camStats ? Number(camStats.online) : 0,
        doors: child._count.doors,
        members: child._count.members,
      };
    });

    return {
      totals: {
        sites: children.length,
        cameras: cameraTotals.total,
        camerasOnline: cameraTotals.online,
        doors: children.reduce((sum, c) => sum + c._count.doors, 0),
        members: children.reduce((sum, c) => sum + c._count.members, 0),
        activeAlerts: activeAlertsCount,
        avgUptime: `${avgUptime}%`,
      },
      perSite,
    };
  }

  /**
   * Global search across all child sites (D-29).
   * Searches events, people, and credentials across child organizations.
   * Results tagged with site name.
   */
  async globalSearch(parentOrgId: string, query: string, type?: string) {
    const children = await this.prisma.organization.findMany({
      where: { parentOrganizationId: parentOrgId, isActive: true },
      select: { id: true, name: true },
    });

    const childIds = children.map((c) => c.id);
    if (childIds.length === 0) return { events: [], people: [], credentials: [] };

    const searchTerm = `%${query}%`;

    const results: {
      events: Array<Record<string, unknown>>;
      people: Array<Record<string, unknown>>;
      credentials: Array<Record<string, unknown>>;
    } = { events: [], people: [], credentials: [] };

    // Search events (alerts)
    if (!type || type === "events") {
      const events = await this.prisma.alert.findMany({
        where: {
          organizationId: { in: childIds },
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          status: true,
          createdAt: true,
          organizationId: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      results.events = events.map((e) => ({
        ...e,
        siteName: children.find((c) => c.id === e.organizationId)?.name ?? "Unknown",
      }));
    }

    // Search people (faces, users)
    if (!type || type === "people") {
      const faces = await this.prisma.face.findMany({
        where: {
          organizationId: { in: childIds },
          name: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          isBlacklisted: true,
          organizationId: true,
          createdAt: true,
        },
        take: 20,
      });

      const users = await this.prisma.user.findMany({
        where: {
          memberships: {
            some: {
              organizationId: { in: childIds },
            },
          },
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          memberships: {
            select: {
              organizationId: true,
              role: true,
            },
          },
        },
        take: 20,
      });

      results.people = [
        ...faces.map((f) => ({
          type: "face" as const,
          id: f.id,
          name: f.name,
          isBlacklisted: f.isBlacklisted,
          siteName: children.find((c) => c.id === f.organizationId)?.name ?? "Unknown",
          createdAt: f.createdAt,
        })),
        ...users.map((u) => ({
          type: "user" as const,
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          siteName: u.memberships[0]
            ? children.find((c) => c.id === u.memberships[0].organizationId)?.name ?? "Unknown"
            : "Unknown",
        })),
      ];
    }

    // Search credentials
    if (!type || type === "credentials") {
      const credentials = await this.prisma.credential.findMany({
        where: {
          organizationId: { in: childIds },
          OR: [
            { badgeNumber: { contains: query, mode: "insensitive" } },
            { user: { firstName: { contains: query, mode: "insensitive" } } },
            { user: { lastName: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          type: true,
          badgeNumber: true,
          isActive: true,
          organizationId: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        take: 20,
      });

      results.credentials = credentials.map((c) => ({
        ...c,
        siteName: children.find((ch) => ch.id === c.organizationId)?.name ?? "Unknown",
      }));
    }

    return results;
  }

  /**
   * Side-by-side metrics comparison across all child sites (BAS-15).
   */
  async getComparison(parentOrgId: string) {
    const children = await this.prisma.organization.findMany({
      where: { parentOrganizationId: parentOrgId, isActive: true },
      include: {
        _count: { select: { cameras: true, doors: true, members: true, alerts: true, zones: true } },
      },
    });

    const childIds = children.map((c) => c.id);

    // Per-site stats
    const siteStats = await Promise.all(
      children.map(async (site) => {
        const camerasTotal = site._count.cameras;

        const onlineCamerasCount = await this.prisma.camera.count({
          where: { organizationId: site.id, status: "ONLINE" },
        });

        const activeAlertsCount = await this.prisma.alert.count({
          where: { organizationId: site.id, status: "OPEN" },
        });

        const uptime = camerasTotal > 0
          ? Math.round((onlineCamerasCount / camerasTotal) * 100)
          : 0;

        return {
          id: site.id,
          name: site.name,
          city: site.city,
          cameras: { total: camerasTotal, online: onlineCamerasCount },
          doors: site._count.doors,
          members: site._count.members,
          zones: site._count.zones,
          activeAlerts: activeAlertsCount,
          uptime: `${uptime}%`,
        };
      }),
    );

    return { comparison: siteStats };
  }

  /**
   * KPI for a single site (camera count, active alerts, storage, uptime).
   */
  async getSiteStats(id: string) {
    const site = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, city: true, country: true },
    });
    if (!site) throw new NotFoundException("Site not found");

    const [camerasTotal, camerasOnline, activeAlerts, zones, doors] = await Promise.all([
      this.prisma.camera.count({ where: { organizationId: id } }),
      this.prisma.camera.count({ where: { organizationId: id, status: "ONLINE" } }),
      this.prisma.alert.count({ where: { organizationId: id, status: "OPEN" } }),
      this.prisma.zone.count({ where: { organizationId: id } }),
      this.prisma.door.count({ where: { organizationId: id } }),
    ]);

    const uptime = camerasTotal > 0 ? Math.round((camerasOnline / camerasTotal) * 100) : 0;

    return {
      ...site,
      cameras: { total: camerasTotal, online: camerasOnline },
      doors,
      zones,
      activeAlerts,
      uptime: `${uptime}%`,
    };
  }
}
