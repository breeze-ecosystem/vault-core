import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class SiteService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { isActive?: boolean; city?: string; page?: number; limit?: number }) {
    const where: Prisma.OrganizationWhereInput = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.city) where.city = { contains: filters.city, mode: "insensitive" };

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { cameras: true, members: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const site = await this.prisma.organization.findUnique({
      where: { id },
      include: { cameras: true, _count: { select: { members: true } } },
    });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  async create(data: Prisma.OrganizationCreateInput) {
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput) {
    await this.findById(id);
    return this.prisma.organization.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.organization.update({ where: { id }, data: { isActive: false } });
  }

  // ── BASTION Multi-site Extensions ──

  /**
   * Get KPI stats for a single site (BAS-13).
   */
  async getSiteStats(orgId: string) {
    const site = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, city: true, country: true },
    });
    if (!site) throw new NotFoundException("Site not found");

    const [camerasTotal, camerasOnline, activeAlerts, zones, doors] = await Promise.all([
      this.prisma.camera.count({ where: { organizationId: orgId } }),
      this.prisma.camera.count({ where: { organizationId: orgId, status: "ONLINE" } }),
      this.prisma.alert.count({ where: { organizationId: orgId, status: "OPEN" } }),
      this.prisma.zone.count({ where: { organizationId: orgId } }),
      this.prisma.door.count({ where: { organizationId: orgId } }),
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

  /**
   * Get child organizations for a parent org.
   */
  async getChildren(orgId: string) {
    return this.prisma.organization.findMany({
      where: { parentOrganizationId: orgId, isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        isActive: true,
        createdAt: true,
        _count: { select: { cameras: true, doors: true, members: true } },
      },
      orderBy: { name: "asc" },
    });
  }
}
