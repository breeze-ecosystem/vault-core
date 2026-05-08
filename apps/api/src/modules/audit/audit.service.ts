import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, { old?: unknown; new: unknown }>;
  request?: FastifyRequest;
}

export interface AuditLogFilters {
  userId?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry.
   * Extracts IP and user-agent from request if provided.
   */
  async log(params: AuditLogParams) {
    const ipAddress = params.request
      ? this.extractIpAddress(params.request)
      : undefined;
    const userAgent = params.request
      ? (params.request.headers['user-agent'] as string) || undefined
      : undefined;

    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          changes: params.changes ? (params.changes as any) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch {
      // Don't fail the request if audit logging fails
      return null;
    }
  }

  /**
   * Get paginated audit logs with filters.
   */
  async getLogs(
    filters: AuditLogFilters,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;
    if (filters.action) where.action = filters.action;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as any).gte = new Date(filters.from);
      if (filters.to) (where.createdAt as any).lte = new Date(filters.to);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get aggregated audit log statistics.
   */
  async getStats(filters?: { from?: string; to?: string }) {
    const fromDate = filters?.from
      ? new Date(filters.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = filters?.to ? new Date(filters.to) : new Date();

    // Actions per day
    const actionsPerDay = await this.prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "AuditLog"
      WHERE "createdAt" >= ${fromDate} AND "createdAt" <= ${toDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `;

    // Top users by action count
    const topUsers = await this.prisma.$queryRaw`
      SELECT u.id, u.email, u."firstName", u."lastName", COUNT(a.id) as action_count
      FROM "AuditLog" a
      LEFT JOIN "User" u ON a."userId" = u.id
      WHERE a."createdAt" >= ${fromDate} AND a."createdAt" <= ${toDate}
      GROUP BY u.id, u.email, u."firstName", u."lastName"
      ORDER BY action_count DESC
      LIMIT 10
    `;

    // Action type distribution
    const actionDistribution = await this.prisma.$queryRaw`
      SELECT action, COUNT(*) as count
      FROM "AuditLog"
      WHERE "createdAt" >= ${fromDate} AND "createdAt" <= ${toDate}
      GROUP BY action
      ORDER BY count DESC
    `;

    // Entity distribution
    const entityDistribution = await this.prisma.$queryRaw`
      SELECT entity, COUNT(*) as count
      FROM "AuditLog"
      WHERE "createdAt" >= ${fromDate} AND "createdAt" <= ${toDate}
      GROUP BY entity
      ORDER BY count DESC
    `;

    // Total count
    const total = await this.prisma.auditLog.count({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
      },
    });

    return {
      total,
      actionsPerDay,
      topUsers,
      actionDistribution,
      entityDistribution,
    };
  }

  private extractIpAddress(request: FastifyRequest): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    const xff = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return (
      xff?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      undefined
    );
  }
}
