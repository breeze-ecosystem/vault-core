import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { NotificationService } from "./notification.service";
import { NotificationGateway } from "./notification.gateway";
import { NotificationProcessor } from "./notification.processor";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [
    QueueModule,
    JwtModule.register({}),
  ],
  providers: [NotificationService, NotificationGateway, NotificationProcessor],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
