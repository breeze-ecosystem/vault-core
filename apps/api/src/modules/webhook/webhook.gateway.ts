import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { OnEvent } from "@nestjs/event-emitter";

@WebSocketGateway({ namespace: "/ws/webhooks" })
export class WebhookGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebhookGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const orgId = client.handshake.auth?.orgId;
    client.data.orgId = orgId;
    if (!orgId) client.disconnect();
    this.logger.log(`Webhook WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Webhook WS client disconnected: ${client.id}`);
  }

  @OnEvent("webhook.delivery-completed", { async: true })
  handleDeliveryCompleted(payload: {
    subscriptionId: string;
    orgId: string;
    deliveryId: string;
    statusCode: number;
    eventType: string;
    timestamp: Date;
  }) {
    this.server
      .to(`org:${payload.orgId}`)
      .emit("webhook:delivery-completed", payload);
  }

  @OnEvent("webhook.delivery-failed", { async: true })
  handleDeliveryFailed(payload: {
    subscriptionId: string;
    orgId: string;
    deliveryId: string;
    attemptNumber: number;
    eventType: string;
    error: string;
    timestamp: Date;
  }) {
    this.server
      .to(`org:${payload.orgId}`)
      .emit("webhook:delivery-failed", payload);
  }
}
