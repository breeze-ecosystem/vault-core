import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, AlertSeverity, AlertStatus } from "@prisma/client";

export interface EventSearchFilters {
  dateFrom?: string;
  dateTo?: string;
  cameraId?: string;
  eventType?: string;
  severity?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async search(
    orgId: string,
    filters: EventSearchFilters,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AlertWhereInput = {
      organizationId: orgId,
    };

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as any).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        (where.createdAt as any).lte = new Date(filters.dateTo);
      }
    }

    // Camera filter
    if (filters.cameraId) {
      where.cameraId = filters.cameraId;
    }

    // Event type mapping (VIS-14: searchable by event type)
    if (filters.eventType) {
      switch (filters.eventType) {
        case "motion":
          // Motion events: class_id based alerts (from AI pipeline)
          where.metadata = {
            path: ["class_id"],
            not: undefined,
          };
          break;
        case "face":
          // Face events: alerts where metadata contains face match
          where.metadata = {
            path: ["faceMatch"],
            not: undefined,
          };
          break;
        case "alert":
          // Severity-based alerts
          where.severity = {
            in: ["CRITICAL", "HIGH", "MEDIUM"],
          } as any;
          break;
        case "system":
          // System events are low severity / informational
          where.severity = "INFO" as AlertSeverity;
          break;
        default:
          // No additional filter
          break;
      }
    }

    // Severity filter
    if (filters.severity) {
      where.severity = filters.severity as AlertSeverity;
    }

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          camera: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getEventCountByDate(
    orgId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<{ date: string; count: number }[]> {
    // Use raw query for efficient date-bucketed counting
    const results = (await this.prisma.$queryRawUnsafe(
      `SELECT DATE(created_at) AS date, COUNT(*)::int AS count
       FROM "Alert"
       WHERE organization_id = $1::uuid
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      orgId,
      new Date(dateFrom),
      new Date(dateTo),
    )) as { date: string; count: number }[];

    return results;
  }

  async getEventDetail(eventId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: eventId },
      include: {
        camera: {
          select: { id: true, name: true, rtspUrl: true },
        },
        notificationLogs: {
          select: { channel: true, status: true, sentAt: true },
          orderBy: { sentAt: "desc" },
          take: 5,
        },
      },
    });

    if (!alert) {
      throw new NotFoundException("Événement introuvable");
    }

    return {
      id: alert.id,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      status: alert.status,
      camera: alert.camera,
      snapshotUrl: alert.snapshotUrl,
      metadata: alert.metadata,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      notifications: alert.notificationLogs,
      // The clip export URL can be constructed client-side:
      // /api/recording/events/${eventId}/export
    };
  }
}
