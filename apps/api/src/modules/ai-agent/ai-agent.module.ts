import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DiscoveryModule } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import Redis from "ioredis";

// Foundation services
import { SkillRegistry } from "./skills/skill-registry.service";
import { LlmProviderService } from "./llm/llm-provider.service";
import { OrchestratorService } from "./orchestrator.service";
import { ChatController } from "./sse/chat.controller";

// Memory, tracing, resilience
import { ConversationMemory } from "./memory/conversation.memory";
import { CompressionService } from "./memory/compression.service";
import { AgentTraceService } from "./tracing/agent-trace.service";
import { DegradationService } from "./fallback/degradation.service";

// Guards
import { MemoryScopeGuard } from "./memory/memory-scope.guard";
import { ActionConfirmationGuard } from "./guardrails/action-confirmation.guard";
import { RbacAgentGuard } from "./guardrails/rbac-agent.guard";
import { RateLimitAgentGuard } from "./guardrails/rate-limit-agent.guard";

// MCP Servers
import { EventsMcpServer } from "./mcp/events.mcp.server";
import { DoorsMcpServer } from "./mcp/doors.mcp.server";
import { RiskMcpServer } from "./mcp/risk.mcp.server";
import { CamerasMcpServer } from "./mcp/cameras.mcp.server";

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

const RedisAgentProvider = {
  provide: "REDIS_AGENT",
  useFactory: (cfg: ConfigService) => {
    return new Redis({
      host: cfg.get("redis.host", "localhost"),
      port: cfg.get("redis.port", 6379),
      password: cfg.get("redis.password") || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  },
  inject: [ConfigService],
};

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
    // Redis provider (REDIS_AGENT)
    RedisAgentProvider,

    // Foundation
    SkillRegistry,
    LlmProviderService,
    OrchestratorService,

    // Memory, tracing, resilience
    ConversationMemory,
    CompressionService,
    AgentTraceService,
    DegradationService,

    // MCP Servers (4)
    EventsMcpServer,
    DoorsMcpServer,
    RiskMcpServer,
    CamerasMcpServer,

    // Guards (4)
    MemoryScopeGuard,
    ActionConfirmationGuard,
    RbacAgentGuard,
    RateLimitAgentGuard,

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
    // Foundation
    SkillRegistry,
    LlmProviderService,
    OrchestratorService,

    // Memory and tracing (external consumers need these)
    ConversationMemory,
    AgentTraceService,

    // MCP Servers (for external MCP protocol integration)
    EventsMcpServer,
    DoorsMcpServer,
    RiskMcpServer,
    CamerasMcpServer,

    // Agents (5)
    EventSearchAgent,
    RiskAnalysisAgent,
    PatternDetectionAgent,
    IncidentAgent,
    DoorControlAgent,
  ],
})
export class AiAgentModule {}
