import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

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
}
