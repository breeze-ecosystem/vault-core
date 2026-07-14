import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ namespace: "/ws/visitors" })
export class VisitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VisitorGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Visitor WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Visitor WS client disconnected: ${client.id}`);
  }
}
