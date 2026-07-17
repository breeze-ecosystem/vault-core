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

  // ── Phase 2 Event Handlers ──

  @OnEvent("door.osdp-event", { async: true })
  handleOsdpEvent(payload: {
    doorId: string; orgId: string; eventType: string;
    badgeNumber?: string; direction?: string; tampered?: boolean; timestamp: string;
  }) {
    this.server.to(`org:${payload.orgId}`).emit("door:osdp-event", payload);
  }

  @OnEvent("controller.status", { async: true })
  handleControllerStatus(payload: {
    controllerId: string; status: string; batteryLevel?: number;
    cpuLoad?: number; memoryUsage?: number;
  }) {
    const orgId = payload.controllerId.split("-")[0];
    this.server.to(`org:${orgId}`).emit("controller:status", payload);
  }

  @OnEvent("controller.discovery", { async: true })
  handleControllerDiscovery(payload: {
    controllerId: string; serialNumber: string; manufacturer: string; model: string;
  }) {
    this.server.to(`org:${payload.controllerId.split("-")[0]}`).emit("controller:discovery", payload);
  }

  @OnEvent("ptz.preset-update", { async: true })
  handlePtzPresetUpdate(payload: { cameraId: string; presets: any[] }) {
    this.server.to(`camera:${payload.cameraId}`).emit("ptz:preset-update", payload);
  }

  @OnEvent("door.command-state", { async: true })
  handleCommandState(payload: { doorId: string; state: string; timestamp: string }) {
    this.server.to(`door:${payload.doorId}`).emit("door:command-state", payload);
  }
}
