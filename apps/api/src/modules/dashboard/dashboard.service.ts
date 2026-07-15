import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      camerasOnline,
      camerasOffline,
      camerasMaintenance,
      camerasDegraded,
      camerasTotal,
      alertsOpen,
      alertsCritical,
      alertsHigh,
      alertsMedium,
      alertsLow,
      alertsInfo,
      alertsTotal,
      sitesActive,
      sitesTotal,
      usersTotal,
      recentAlerts,
    ] = await Promise.all([
      this.prisma.camera.count({ where: { status: "ONLINE" } }),
      this.prisma.camera.count({ where: { status: "OFFLINE" } }),
      this.prisma.camera.count({ where: { status: "MAINTENANCE" } }),
      this.prisma.camera.count({ where: { status: "DEGRADED" } }),
      this.prisma.camera.count(),
      this.prisma.alert.count({ where: { status: "OPEN" } }),
      this.prisma.alert.count({ where: { severity: "CRITICAL" } }),
      this.prisma.alert.count({ where: { severity: "HIGH" } }),
      this.prisma.alert.count({ where: { severity: "MEDIUM" } }),
      this.prisma.alert.count({ where: { severity: "LOW" } }),
      this.prisma.alert.count({ where: { severity: "INFO" } }),
      this.prisma.alert.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.organization.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.alert.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          camera: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      cameras: {
        total: camerasTotal,
        online: camerasOnline,
        offline: camerasOffline,
        maintenance: camerasMaintenance,
        degraded: camerasDegraded,
      },
      alerts: {
        total: alertsTotal,
        open: alertsOpen,
        critical: alertsCritical,
        high: alertsHigh,
        medium: alertsMedium,
        low: alertsLow,
        info: alertsInfo,
      },
      sites: {
        total: sitesTotal,
        active: sitesActive,
      },
      users: {
        total: usersTotal,
      },
      recentAlerts,
    };
  }
}
