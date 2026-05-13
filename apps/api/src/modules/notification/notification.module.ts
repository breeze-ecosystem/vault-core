import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { NotificationService } from "./notification.service";
import { NotificationGateway } from "./notification.gateway";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [
    QueueModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
