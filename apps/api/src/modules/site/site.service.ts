import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class SiteService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { isActive?: boolean; city?: string }) {
    const where: Prisma.SiteWhereInput = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.city) where.city = { contains: filters.city, mode: "insensitive" };

    const [data, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        include: { _count: { select: { cameras: true, users: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.site.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: { cameras: true, _count: { select: { users: true } } },
    });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  async create(data: Prisma.SiteCreateInput) {
    return this.prisma.site.create({ data });
  }

  async update(id: string, data: Prisma.SiteUpdateInput) {
    await this.findById(id);
    return this.prisma.site.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.site.update({ where: { id }, data: { isActive: false } });
  }
}
