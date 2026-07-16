import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DiscoveryModule } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";

// Foundation services
import { SkillRegistry } from "./skills/skill-registry.service";
import { LlmProviderService } from "./llm/llm-provider.service";
import { OrchestratorService } from "./orchestrator.service";
import { ChatController } from "./sse/chat.controller";

// Agent services
import { EventSearchAgent } from "./agents/event-search.agent";
import { RiskAnalysisAgent } from "./agents/risk-analysis.agent";
import { PatternDetectionAgent } from "./agents/pattern-detection.agent";
import { IncidentAgent } from "./agents/incident.agent";
import { DoorControlAgent } from "./agents/door-control.agent";

// Skill classes (@Skill decorated)
import { SearchEventsSkill } from "./skills/skills/search-events.skill";
import { GetRiskScoreSkill } from "./skills/skills/get-risk-score.skill";
import { AnalyzePatternSkill } from "./skills/skills/analyze-pattern.skill";
import { SummarizeIncidentSkill } from "./skills/skills/summarize-incident.skill";
import { ControlDoorSkill } from "./skills/skills/control-door.skill";
import { AssessCameraSkill } from "./skills/skills/assess-camera.skill";

// External modules (for injected services)
import { RiskModule } from "../risk/risk.module";

@Module({
  imports: [
    DiscoveryModule,
    ConfigModule,
    EventEmitterModule,
    RiskModule,
    BullModule.registerQueue({ name: "ai-agent" }),
  ],
  controllers: [ChatController],
  providers: [
    // Foundation
    SkillRegistry,
    LlmProviderService,
    OrchestratorService,
    // Agents (5)
    EventSearchAgent,
    RiskAnalysisAgent,
    PatternDetectionAgent,
    IncidentAgent,
    DoorControlAgent,
    // Skills (6)
    SearchEventsSkill,
    GetRiskScoreSkill,
    AnalyzePatternSkill,
    SummarizeIncidentSkill,
    ControlDoorSkill,
    AssessCameraSkill,
  ],
  exports: [
    SkillRegistry,
    LlmProviderService,
    OrchestratorService,
    EventSearchAgent,
    RiskAnalysisAgent,
    PatternDetectionAgent,
    IncidentAgent,
    DoorControlAgent,
  ],
})
export class AiAgentModule {}
