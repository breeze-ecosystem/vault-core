import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DiscoveryModule } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { SkillRegistry } from "./skills/skill-registry.service";
import { LlmProviderService } from "./llm/llm-provider.service";
import { OrchestratorService } from "./orchestrator.service";
import { ChatController } from "./sse/chat.controller";

@Module({
  imports: [
    DiscoveryModule,
    ConfigModule,
    EventEmitterModule,
    BullModule.registerQueue({ name: "ai-agent" }),
  ],
  controllers: [ChatController],
  providers: [SkillRegistry, LlmProviderService, OrchestratorService],
  exports: [SkillRegistry, LlmProviderService, OrchestratorService],
})
export class AiAgentModule {}
