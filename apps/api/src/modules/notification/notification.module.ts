import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { NotificationService } from "./notification.service";
import { NotificationGateway } from "./notification.gateway";
import { NotificationProcessor } from "./notification.processor";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [
    QueueModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  providers: [NotificationService, NotificationGateway, NotificationProcessor],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
