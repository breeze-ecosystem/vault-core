import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CameraService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { status?: string; siteId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.siteId) where.siteId = filters.siteId;

    const [data, total] = await Promise.all([
      this.prisma.camera.findMany({
        where,
        include: { site: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.camera.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true } },
        alerts: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!camera) throw new NotFoundException("Camera not found");
    return camera;
  }

  async create(data: any) {
    return this.prisma.camera.create({
      data,
      include: { site: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: any) {
    await this.findById(id);
    return this.prisma.camera.update({
      where: { id },
      data,
      include: { site: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.camera.delete({ where: { id } });
  }
}
