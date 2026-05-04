import { Module } from "@nestjs/common";
import { InferenceService } from "./inference.service";
import { InferenceProcessor } from "./inference.processor";
import { QueueModule } from "../queue/queue.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationModule } from "../notification/notification.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [QueueModule, PrismaModule, NotificationModule, ConfigModule],
  providers: [InferenceService, InferenceProcessor],
  exports: [InferenceService],
})
export class InferenceModule {}
