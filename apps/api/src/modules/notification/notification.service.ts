import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface NotificationPayload {
  alertId: string;
  title: string;
  description?: string;
  severity: string;
  cameraId: string;
  cameraName: string;
  snapshotUrl?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private wsClients: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(private prisma: PrismaService) {}

  registerClient(userId: string, socketId: string) {
    if (!this.wsClients.has(userId)) {
      this.wsClients.set(userId, new Set());
    }
    this.wsClients.get(userId)!.add(socketId);
  }

  removeClient(socketId: string) {
    for (const [userId, sockets] of this.wsClients) {
      sockets.delete(socketId);
      if (sockets.size === 0) this.wsClients.delete(userId);
    }
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.wsClients.keys());
  }

  async dispatchAlert(payload: NotificationPayload) {
    this.logger.log(`Dispatching notification for alert ${payload.alertId}`);
    // WebSocket dispatch handled by gateway directly
    // Push notifications via FCM tokens
    const tokens = await this.prisma.mobilePushToken.findMany({
      where: { user: { role: { in: ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"] } } },
    });

    for (const t of tokens) {
      try {
        // FCM push would go here with firebase-admin
        this.logger.debug(`Push to ${t.token?.substring(0, 10)}... on ${t.platform}`);
      } catch {
        this.logger.warn(`Failed to push to token ${t.id}`);
      }
    }
  }
}
