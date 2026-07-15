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
import type { RiskScoreDto } from "@repo/shared";

@WebSocketGateway({ namespace: "/ws/risk", cors: true })
export class RiskGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RiskGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Risk WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Risk WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe:site")
  handleSubscribeSite(client: Socket, payload: { orgId: string }) {
    const room = `org:${payload.orgId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to risk updates for site ${payload.orgId}`);
  }

  @SubscribeMessage("subscribe:zone")
  handleSubscribeZone(client: Socket, payload: { zoneId: string }) {
    const room = `risk:zone:${payload.zoneId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to risk updates for zone ${payload.zoneId}`);
  }

  /**
   * Emit risk score update to subscribed clients.
   * Called by RiskService via OnEvent after each score computation.
   */
  @OnEvent("risk.score-updated", { async: true })
  handleRiskScoreUpdated(payload: { orgId: string; zoneId: string; score: RiskScoreDto }) {
    // Emit to site room
    this.server
      .to(`org:${payload.orgId}`)
      .emit("score-update", payload.score);

    // Emit to zone room
    this.server
      .to(`risk:zone:${payload.zoneId}`)
      .emit("score-update", payload.score);
  }
}
