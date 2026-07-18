import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { NotificationService } from "./notification.service";
import { NotificationGateway } from "./notification.gateway";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [
    QueueModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_ACCESS_SECRET", "change-me-access-secret-in-prod"),
      }),
    }),
    ConfigModule,
  ],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
