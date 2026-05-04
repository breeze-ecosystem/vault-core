import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NotificationService } from "./notification.service";

@WebSocketGateway({
  cors: { origin: "*", methods: ["GET", "POST"] },
  namespace: "/ws/alerts",
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private jwt: JwtService,
    private notifService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = this.jwt.verify(token as string);
      const userId = payload.sub;
      this.notifService.registerClient(userId, client.id);
      client.data.userId = userId;
      this.logger.debug(`WS client connected: ${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.notifService.removeClient(client.id);
  }

  broadcastAlert(alert: Record<string, unknown>) {
    this.server.emit("alert", alert);
  }

  broadcastToRole(role: string, event: string, data: unknown) {
    // Simple broadcast - in production, track roles per socket
    this.server.emit(event, data);
  }
}
