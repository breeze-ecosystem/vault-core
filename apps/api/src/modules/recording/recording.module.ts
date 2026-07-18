import { Module } from "@nestjs/common";
import { RecordingService } from "./recording.service";
import { RecordingController } from "./recording.controller";
import { RecordingCleanupService } from "./recording-cleanup.service";

@Module({
  controllers: [RecordingController],
  providers: [RecordingService, RecordingCleanupService],
  exports: [RecordingService],
})
export class RecordingModule {}
