import { Module } from "@nestjs/common";
import { InferenceService } from "./inference.service";
import { InferenceProcessor } from "./inference.processor";
import { QueueModule } from "../queue/queue.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [QueueModule, NotificationsModule, ConfigModule],
  providers: [InferenceService, InferenceProcessor],
  exports: [InferenceService],
})
export class InferenceModule {}
