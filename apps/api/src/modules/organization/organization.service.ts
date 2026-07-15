import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class OrganizationService {
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
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!organization) throw new NotFoundException("Organization not found");
    return organization;
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
}
