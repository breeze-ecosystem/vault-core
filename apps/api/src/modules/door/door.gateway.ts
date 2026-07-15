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

@WebSocketGateway({ namespace: "/ws/doors" })
export class DoorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DoorGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const orgId = client.handshake.auth?.orgId;
    client.data.orgId = orgId;
    if (!orgId) client.disconnect();
    this.logger.log(`Door WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Door WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe:site")
  handleSubscribeSite(client: Socket, payload: { orgId: string }) {
    const room = `org:${payload.orgId}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} subscribed to door updates for ${room}`,
    );
  }

  @SubscribeMessage("subscribe:door")
  handleSubscribeDoor(client: Socket, payload: { doorId: string }) {
    const room = `door:${payload.doorId}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} subscribed to door ${payload.doorId}`,
    );
  }

  @OnEvent("door.state-changed", { async: true })
  handleDoorStateChanged(payload: {
    doorId: string;
    orgId: string;
    zoneId: string;
    previousState: string;
    newState: string;
    timestamp: Date;
  }) {
    this.server
      .to(`org:${payload.orgId}`)
      .emit("state-update", payload);
    this.server
      .to(`door:${payload.doorId}`)
      .emit("state-update", payload);
  }

  @OnEvent("zone.emergency", { async: true })
  handleZoneEmergency(payload: {
    zoneId: string;
    orgId: string;
    status: string;
    triggeredBy: string;
    timestamp: Date;
  }) {
    this.server
      .to(`org:${payload.orgId}`)
      .emit("emergency-update", payload);
  }
}
