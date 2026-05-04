import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? params.metadata as any : undefined,
        ipAddress: params.ipAddress,
      },
    });
  }

  async getLogs(filters: { userId?: string; entity?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
