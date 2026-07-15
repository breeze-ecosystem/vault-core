import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/ws/analytics', cors: true })
export class AnalyticsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AnalyticsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Analytics WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Analytics WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:site')
  handleSubscribeSite(client: Socket, orgId: string) {
    client.join(`analytics:${orgId}`);
    this.logger.log(`Client ${client.id} subscribed to analytics for org ${orgId}`);
  }
}
