import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/ws/analytics', cors: true })
export class AnalyticsGateway {
  private readonly logger = new Logger(AnalyticsGateway.name);

  @WebSocketServer()
  server!: Server;
}
