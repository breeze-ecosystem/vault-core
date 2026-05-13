import { Module } from "@nestjs/common";
import { IngestionService } from "./ingestion.service";
import { IngestionController } from "./ingestion.controller";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [QueueModule],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
