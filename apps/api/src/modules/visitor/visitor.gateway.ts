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

@WebSocketGateway({ namespace: "/ws/visitors" })
export class VisitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VisitorGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const orgId = client.handshake.auth?.orgId;
    client.data.orgId = orgId;
    if (!orgId) client.disconnect();
    this.logger.log(`Visitor WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Visitor WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe:site")
  handleSubscribeSite(client: Socket, orgId: string) {
    client.join(`org:${orgId}`);
    this.logger.log(`Client ${client.id} subscribed to visitor events for site ${orgId}`);
  }

  @OnEvent("visitor.preregistered", { async: true })
  handleVisitorPreregistered(payload: any) {
    this.server.to(`org:${payload.orgId || "all"}`).emit("visitor.preregistered", {
      visitId: payload.visitId,
      visitorName: payload.visitorName,
      timestamp: payload.timestamp,
    });
    this.logger.log(`Emitted visitor.preregistered for ${payload.visitId}`);
  }

  @OnEvent("visitor.checked-in", { async: true })
  handleVisitorCheckedIn(payload: any) {
    this.server.to(`org:${payload.orgId || "all"}`).emit("visitor.checked-in", {
      visitId: payload.visitId,
      visitorName: payload.visitorName,
      timestamp: payload.timestamp,
    });
    this.logger.log(`Emitted visitor.checked-in for ${payload.visitId}`);
  }

  @OnEvent("visitor.checked-out", { async: true })
  handleVisitorCheckedOut(payload: any) {
    this.server.to(`org:${payload.orgId || "all"}`).emit("visitor.checked-out", {
      visitId: payload.visitId,
      visitorName: payload.visitorName,
      timestamp: payload.timestamp,
    });
    this.logger.log(`Emitted visitor.checked-out for ${payload.visitId}`);
  }

  @OnEvent("visitor.cancelled", { async: true })
  handleVisitorCancelled(payload: any) {
    this.server.to(`org:${payload.orgId || "all"}`).emit("visitor.cancelled", {
      visitId: payload.visitId,
      timestamp: payload.timestamp,
    });
    this.logger.log(`Emitted visitor.cancelled for ${payload.visitId}`);
  }
}
