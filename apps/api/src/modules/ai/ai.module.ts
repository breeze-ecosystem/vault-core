import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiProcessor } from "./ai.processor";

@Module({
  imports: [
    BullModule.registerQueue({ name: "ai-summaries" }),
  ],
  controllers: [AiController],
  providers: [AiService, AiProcessor],
  exports: [AiService],
})
export class AiModule {}
