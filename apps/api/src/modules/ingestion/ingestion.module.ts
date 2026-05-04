import { Module } from "@nestjs/common";
import { IngestionService } from "./ingestion.service";
import { IngestionController } from "./ingestion.controller";
import { QueueModule } from "../queue/queue.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [QueueModule, PrismaModule],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
