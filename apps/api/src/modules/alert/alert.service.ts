import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, AlertSeverity, AlertStatus } from "@prisma/client";

@Injectable()
export class AlertService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    severity?: string;
    status?: string;
    cameraId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.AlertWhereInput = {};
    if (filters?.severity) where.severity = filters.severity as AlertSeverity;
    if (filters?.status) where.status = filters.status as AlertStatus;
    if (filters?.cameraId) where.cameraId = filters.cameraId;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          camera: { select: { id: true, name: true, site: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: {
        camera: { select: { id: true, name: true } },
      },
    });
    if (!alert) throw new NotFoundException("Alert not found");
    return alert;
  }

  async create(data: Prisma.AlertCreateInput) {
    return this.prisma.alert.create({
      data,
      include: { camera: { select: { id: true, name: true } } },
    });
  }

  async acknowledge(id: string, userId: string) {
    await this.findById(id);
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolve(id: string, userId: string) {
    await this.findById(id);
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async markFalsePositive(id: string, userId: string) {
    await this.findById(id);
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: "FALSE_POSITIVE",
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });
  }
}
