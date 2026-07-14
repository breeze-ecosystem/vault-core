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

@WebSocketGateway({ namespace: "/ws/incidents" })
export class IncidentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(IncidentGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Incidents WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Incidents WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe:incidents")
  handleSubscribeIncidents(client: Socket, siteId: string) {
    client.join(`site:${siteId}`);
    this.logger.log(`Client ${client.id} subscribed to incidents for site ${siteId}`);
  }

  @SubscribeMessage("subscribe:incident")
  handleSubscribeIncident(client: Socket, incidentId: string) {
    client.join(`incident:${incidentId}`);
    this.logger.log(`Client ${client.id} subscribed to incident ${incidentId}`);
  }

  @OnEvent("incident.created", { async: true })
  handleIncidentCreated(payload: any) {
    this.server.to(`site:${payload.siteId}`).emit("incident.created", payload);
    this.logger.log(`Emitted incident.created for ${payload.id}`);
  }

  @OnEvent("incident.status-changed", { async: true })
  handleIncidentStatusChanged(payload: any) {
    this.server.to(`site:${payload.siteId}`).emit("incident.status-changed", payload);
    this.server.to(`incident:${payload.id}`).emit("incident.status-changed", payload);
  }

  @OnEvent("incident.assigned", { async: true })
  handleIncidentAssigned(payload: any) {
    this.server.to(`site:${payload.siteId}`).emit("incident.assigned", payload);
    this.server.to(`incident:${payload.id}`).emit("incident.assigned", payload);
  }

  @OnEvent("incident.comment-added", { async: true })
  handleIncidentCommentAdded(payload: any) {
    this.server.to(`incident:${payload.incidentId}`).emit("incident.comment-added", payload);
  }

  @OnEvent("incident.escalated", { async: true })
  handleIncidentEscalated(payload: any) {
    this.server.to(`site:${payload.siteId}`).emit("incident.escalated", payload);
    this.server.to(`incident:${payload.incidentId}`).emit("incident.escalated", payload);
  }
}
