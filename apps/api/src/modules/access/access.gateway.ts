import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { OnEvent } from "@nestjs/event-emitter";

@WebSocketGateway({ namespace: "/ws/access" })
export class AccessGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AccessGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Access WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Access WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe:site")
  handleSubscribeSite(client: Socket, orgId: string) {
    client.join(`org:${orgId}`);
    this.logger.log(`Client ${client.id} subscribed to site ${orgId}`);
  }

  @SubscribeMessage("unsubscribe:site")
  handleUnsubscribeSite(client: Socket, orgId: string) {
    client.leave(`org:${orgId}`);
    this.logger.log(`Client ${client.id} unsubscribed from site ${orgId}`);
  }

  @OnEvent("access.granted", { async: true })
  handleAccessGranted(payload: any) {
    this.server.to(`org:${payload.orgId}`).emit("access.granted", payload);
  }

  @OnEvent("access.denied", { async: true })
  handleAccessDenied(payload: any) {
    this.server.to(`org:${payload.orgId}`).emit("access.denied", payload);
  }
}
