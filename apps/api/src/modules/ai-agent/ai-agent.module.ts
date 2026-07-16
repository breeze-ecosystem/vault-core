import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DiscoveryModule } from "@nestjs/core";
import { SkillRegistry } from "./skills/skill-registry.service";

@Module({
  imports: [
    DiscoveryModule,
    BullModule.registerQueue({ name: "ai-agent" }),
  ],
  providers: [SkillRegistry],
  exports: [SkillRegistry],
})
export class AiAgentModule {}
