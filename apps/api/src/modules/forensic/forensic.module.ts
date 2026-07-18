import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ForensicController } from "./forensic.controller";
import { ForensicService } from "./forensic.service";
import { ForensicProcessor } from "./forensic.processor";

@Module({
  imports: [
    BullModule.registerQueue({ name: "forensic-certification" }),
  ],
  controllers: [ForensicController],
  providers: [ForensicService, ForensicProcessor],
  exports: [ForensicService],
})
export class ForensicModule {}
