# Phase 9: AI Intelligence - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 67 (new + modified)
**Analogs found:** 60 / 67

## File Classification

### New Files — NestJS Agent Module (`apps/api/src/modules/ai-agent/`)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `ai-agent.module.ts` | module | registration | `apps/api/src/modules/ai/ai.module.ts` | exact |
| `orchestrator.service.ts` | service | agent-orchestration | `apps/api/src/modules/ai/ai.service.ts` | role-match |
| `agents/event-search.agent.ts` | service | NL→hybrid-search | `apps/api/src/modules/ai/ai.service.ts` (callOllama + executeEventQuery, lines 38-100, 481-513) | role-match |
| `agents/risk-analysis.agent.ts` | service | LLM-analysis | `apps/api/src/modules/ai/ai.service.ts` (answerQuestion, lines 230-307) | role-match |
| `agents/pattern-detection.agent.ts` | service | LLM-analysis | `apps/api/src/modules/ai/ai.service.ts` (answerQuestion, lines 230-307) | role-match |
| `agents/incident.agent.ts` | service | LLM-summarization | `apps/api/src/modules/ai/ai.service.ts` (generateIncidentSummary, lines 101-199) | exact (same domain) |
| `agents/door-control.agent.ts` | service | vision+action | `apps/api/src/modules/chat/chat.service.ts` + `apps/api/src/modules/inference/inference.service.ts` | role-match |
| `skills/skill-registry.service.ts` | service | registry-discovery | `apps/api/src/modules/ai/ai.module.ts` (provider registration) | partial |
| `skills/skill.decorator.ts` | decorator | metadata | `apps/api/src/common/decorators/roles.decorator.ts` | exact |
| `skills/skills/search-events.skill.ts` | service | tool-execution | `apps/api/src/modules/ai/ai.service.ts` (executeEventQuery, lines 576+) | role-match |
| `skills/skills/get-risk-score.skill.ts` | service | tool-execution | `apps/api/src/modules/risk/risk.service.ts` (getCurrentScores) | role-match |
| `skills/skills/analyze-pattern.skill.ts` | service | tool-execution | `apps/api/src/modules/patterns/patterns.service.ts` (getDetectedPatterns) | role-match |
| `skills/skills/summarize-incident.skill.ts` | service | tool-execution | `apps/api/src/modules/ai/ai.service.ts` (generateIncidentSummary) | role-match |
| `skills/skills/control-door.skill.ts` | service | tool-execution | `apps/api/src/modules/door/door.service.ts` | partial |
| `skills/skills/assess-camera.skill.ts` | service | tool-execution | `apps/api/src/modules/camera/camera.service.ts` | partial |
| `mcp/events.mcp.server.ts` | service | tool-server | No existing MCP server — use `@modelcontextprotocol/sdk` pattern from RESEARCH.md | none |
| `mcp/doors.mcp.server.ts` | service | tool-server | Same as above | none |
| `mcp/risk.mcp.server.ts` | service | tool-server | Same as above | none |
| `mcp/cameras.mcp.server.ts` | service | tool-server | Same as above | none |
| `memory/conversation.memory.ts` | service | cache+persist | `apps/api/src/modules/risk/risk.module.ts` (Redis factory, lines 9-21) | role-match |
| `memory/compression.service.ts` | service | LLM-call | `apps/api/src/modules/ai/ai.service.ts` (callOllama, lines 481-513) | role-match |
| `memory/memory-scope.guard.ts` | guard | RBAC/tenant | `apps/api/src/common/guards/roles.guard.ts` | exact |
| `sse/chat.gateway.ts` | controller | streaming | `apps/api/src/modules/ai/ai.controller.ts` + `apps/api/src/modules/risk/risk.gateway.ts` | partial (SSE is new pattern) |
| `tracing/agent-trace.service.ts` | service | logging | `apps/api/src/modules/ai/ai.service.ts` (Logger pattern, lines 24-25) | role-match |
| `guardrails/action-confirmation.guard.ts` | guard | request-auth | `apps/api/src/common/guards/roles.guard.ts` | exact |
| `guardrails/rbac-agent.guard.ts` | guard | request-auth | `apps/api/src/common/guards/roles.guard.ts` | exact |
| `guardrails/rate-limit-agent.guard.ts` | guard | rate-limit | `apps/api/src/common/guards/roles.guard.ts` (guard structure) | role-match |
| `fallback/degradation.service.ts` | service | health-check | `apps/api/src/modules/ai/ai.service.ts` (checkStatus, lines 452-476) | exact |
| `prompts/orchestrator.prompt.md` | config | static-file | System prompt text pattern from `ai.service.ts` lines 47-60 | exact |
| `prompts/event-search.prompt.md` | config | static-file | Same as above | exact |
| `prompts/risk-analysis.prompt.md` | config | static-file | Same as above | exact |
| `prompts/pattern-detection.prompt.md` | config | static-file | Same as above | exact |
| `prompts/incident.prompt.md` | config | static-file | Same as above | exact |
| `prompts/door-control.prompt.md` | config | static-file | Same as above | exact |

### New Files — Python AI Preprocessor (`services/ai-preprocessor/`)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `routes/detection.py` | route | request-response | `services/ai-preprocessor/app/routes/inference.py` | exact |
| `routes/audio.py` | route | request-response | `services/ai-preprocessor/app/routes/anpr.py` | exact |
| `models/detector.py` | model | lazy-load | Lazy-load pattern in `routes/anpr.py` (lines 14-24, `get_ocr()`) | exact |
| `models/tracker.py` | model | lazy-load | Same as above | exact |
| `models/audio_classifier.py` | model | lazy-load | Same as above | exact |
| `models/transcriber.py` | model | lazy-load | Same as above | exact |

### New Files — Dashboard

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `command-center/page.tsx` | page | request-response + SSE | `apps/dashboard/app/(dashboard)/ia/page.tsx` | exact (replacement) |
| `patterns/page.tsx` | page | request-response | `apps/dashboard/app/(dashboard)/maintenance/page.tsx` + `risque/page.tsx` | role-match |

### New Files — Mobile

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `more/chat.tsx` | screen | request-response + SSE | `apps/mobile/app/(tabs)/more.tsx` | exact |

### New Files — Infrastructure

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `prisma/migrations/*_agent_traces.sql` | migration | schema | Existing migration files in `apps/api/prisma/migrations/` | exact |

### Modified Files

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `ai/ai.service.ts` | service | LLM service | **Self** — existing code extended | exact |
| `ai/ai.controller.ts` | controller | request-response | **Self** — add proxy endpoints | exact |
| `chat/chat.service.ts` | service | VLM chat | **Self** — mark deprecated | exact |
| `chat/chat.module.ts` | module | registration | **Self** — mark deprecated | exact |
| `inference/inference.service.ts` | service | frame-analysis | **Self** — replace pipeline | exact |
| `inference/inference.processor.ts` | processor | queue-worker | `apps/api/src/modules/ai/ai.processor.ts` | exact |
| `patterns/patterns.service.ts` | service | cron+SQL | **Self** — add 3 new pattern definitions | exact |
| `config/configuration.ts` | config | factory | **Self** — add new keys | exact |
| `config/validation.ts` | config | Joi-schema | **Self** — add new vars | exact |
| `dashboard/risque/page.tsx` | page | request-response | **Self** — add "Expliquer" button | exact |
| `dashboard/ia/page.tsx` | page | request-response | **Self** — replace/redirect | exact |
| `dashboard/lib/api.ts` | utility | HTTP-client | **Self** — add agent types + functions | exact |
| `dashboard/lib/nav-config.ts` | config | static-routes | **Self** — add nav items | exact |
| `mobile/(tabs)/_layout.tsx` | layout | navigation | **Self** — no change needed (chat in More tab) | exact |
| `mobile/(tabs)/more.tsx` | screen | menu | **Self** — update chat route | exact |
| `mobile/lib/api.ts` | utility | HTTP-client | **Self** — add agent chat functions | exact |
| `ai-preprocessor/app/main.py` | entry | request-response | **Self** — add new routers | exact |
| `ai-preprocessor/app/routes/inference.py` | route | request-response | **Self** — replace VLM pipeline | exact |
| `ai-preprocessor/app/config.py` | config | pydantic | **Self** — add new settings | exact |
| `ai-preprocessor/requirements.txt` | config | deps | **Self** — add new deps | exact |
| `docker-compose.yml` | config | orchestration | **Self** — add Qdrant service | exact |
| `docker-compose.prod.yml` | config | orchestration | **Self** — add Qdrant + vLLM | exact |
| `.env.example` | config | env-vars | **Self** — add new vars | exact |
| `prisma/schema.prisma` | config | schema | **Self** — add AgentTrace model | exact |

---

## Pattern Assignments — New Files

### 🔷 Group 1: NestJS Module (`ai-agent.module.ts`)

**Analog:** `apps/api/src/modules/ai/ai.module.ts` (all 15 lines)
**Analog:** `apps/api/src/modules/risk/risk.module.ts` (all 31 lines — with Redis factory provider)

**Imports pattern** (ai.module.ts lines 1-5):
```typescript
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiProcessor } from "./ai.processor";
```

**Module declaration pattern** (ai.module.ts lines 7-15):
```typescript
@Module({
  imports: [
    BullModule.registerQueue({ name: "ai-summaries" }),
  ],
  controllers: [AiController],
  providers: [AiService, AiProcessor],
  exports: [AiService],
})
export class AiModule {}
```

**Redis provider factory pattern** (risk.module.ts lines 9-21):
```typescript
const RedisProvider = {
  provide: "REDIS_RISK",
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
```

**Apply to:** `ai-agent.module.ts` — Register all 6 agents + SkillRegistry + MCP servers + SSE controller + guards. Import `BullModule` for agent task queues, `ConfigModule` for Redis/Qdrant config. Export `OrchestratorService` and `SkillRegistry`.

---

### 🔷 Group 2: NestJS Injectable Service (all agent services, orchestrator, skills, MCP servers, memory, tracing, degradation)

**Analog:** `apps/api/src/modules/ai/ai.service.ts`

**Constructor + DI pattern** (lines 23-34):
```typescript
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollamaUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue("ai-summaries") private aiQueue: Queue,
  ) {
    this.ollamaUrl = this.config.get<string>("ollamaBaseUrl", "http://localhost:11434");
  }
```

**Logger pattern** (line 25):
```typescript
private readonly logger = new Logger(AiService.name);
```

**Private Ollama call helper** (lines 481-513) — **reusable pattern for all agent LLM calls:**
```typescript
private async callOllama(model: string, system: string, prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          system,
          stream: false,
          options: { temperature: 0.1 },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Ollama request timed out after 15s");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
```

**Embedding generation pattern** (lines 515-539):
```typescript
private async generateEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.get<string>("ai.embeddingModel", "nomic-embed-text"),
          prompt: text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama embeddings returned ${response.status}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } finally {
      clearTimeout(timeout);
    }
  }
```

**LLM response parsing pattern** (lines 541-573) — **reusable for any structured LLM output:**
```typescript
private parseQueryResponse(response: string): AIQuerySpec {
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return { /* ... typed result ... */ };
    } catch {
      this.logger.warn(`Failed to parse Ollama response as JSON: ${jsonStr.substring(0, 100)}`);
      return { /* ... default/empty result ... */ };
    }
  }
```

**Parameterized SQL query pattern** (lines 576-600+) — **for NL→SQL pipeline:**
```typescript
private async executeEventQuery(spec: AIQuerySpec, organizationId: string | null | undefined) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (organizationId) {
      conditions.push(`ae.organization_id = $${idx}::uuid`);
      values.push(organizationId);
      idx++;
    }
    // ... more conditions using $idx placeholders ...

    const sql = `SELECT ... FROM access_events WHERE ${conditions.join(" AND ")} ...`;
    return this.prisma.$queryRawUnsafe<TimelineEntry[]>(sql, ...values);
  }
```

**Error handling pattern** (lines 63-79, 198-210):
```typescript
try {
  const response = await this.callOllama(/* ... */);
  // ... process
} catch (err: any) {
  this.logger.warn(`Ollama NL query failed: ${err.message}`);
  return { /* ... graceful fallback ... */ };
}
```

**Apply to:**
- `orchestrator.service.ts` → Follow `callOllama()` pattern but use `ollama` npm package's `chat()` with `tools`. Constructor gets ConfigService + Redis + agents injected.
- `agents/event-search.agent.ts` → Follow `naturalLanguageQuery()` (lines 38-100) + `executeEventQuery()` (lines 576+)
- `agents/risk-analysis.agent.ts` → Follow `answerQuestion()` (lines 230-307) — build context, call LLM, parse response
- `agents/pattern-detection.agent.ts` → Same as risk-analysis.agent
- `agents/incident.agent.ts` → Follow `generateIncidentSummary()` (lines 101-199) — fetch data, build prompt, call LLM, parse JSON
- `agents/door-control.agent.ts` → Follow `ChatService` (lines 1-60) + `InferenceService` (all 50 lines)
- `skills/skill-registry.service.ts` → Follow `@Injectable()` + `OnModuleInit` pattern from RiskService (line 34). Use NestJS `DiscoveryService` for auto-scanning.
- All skill implementations → Follow `@Injectable()` + typed execute() returning data. Each calls its respective domain service.
- `memory/conversation.memory.ts` → Follow Redis factory pattern from risk.module.ts lines 9-21, plus `generateEmbedding()` for semantic storage
- `memory/compression.service.ts` → Follow `callOllama()` pattern for summarization calls
- `tracing/agent-trace.service.ts` → Follow Logger pattern + Prisma `create()` for PostgreSQL persistence
- `fallback/degradation.service.ts` → Follow `checkStatus()` pattern (lines 452-476) — HTTP health check with timeout

---

### 🔷 Group 3: NestJS Decorator (`skill.decorator.ts`)

**Analog:** `apps/api/src/common/decorators/roles.decorator.ts` (all 4 lines)

**Pattern:**
```typescript
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Adapt for skills:**
```typescript
import { SetMetadata } from "@nestjs/common";
import { z } from "zod";

export interface SkillDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
}

export const SKILL_METADATA = "SKILL_METADATA";
export const Skill = (def: SkillDefinition) => SetMetadata(SKILL_METADATA, def);
```

---

### 🔷 Group 4: NestJS Guards (`memory-scope.guard.ts`, `action-confirmation.guard.ts`, `rbac-agent.guard.ts`, `rate-limit-agent.guard.ts`)

**Analog:** `apps/api/src/common/guards/roles.guard.ts` (all 42 lines)

**Pattern:**
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }

    // ... role check logic ...

    if (userLevel < minRequired) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
```

**Apply to each guard:**
- `memory-scope.guard.ts` → Same structure. Extract `organizationId` from request user, validate against memory scope.
- `action-confirmation.guard.ts` → Same structure. Check for confirmation token in request body/query.
- `rbac-agent.guard.ts` → Same structure. Check user role against agent action's required role.
- `rate-limit-agent.guard.ts` → Same structure. Increment and check Redis-based rate limit counter.

---

### 🔷 Group 5: NestJS SSE Controller (`sse/chat.gateway.ts`)

**Analog:** `apps/api/src/modules/ai/ai.controller.ts` (all 46 lines) — controller structure
**Analog:** `apps/api/src/modules/risk/risk.gateway.ts` (lines 1-15) — WebSocket gateway header pattern

**Controller pattern** (ai.controller.ts lines 1-21):
```typescript
import { Controller, Post, Get, Body, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AiService } from "./ai.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("query")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async query(
    @Body(new ZodValidationPipe(aiQuerySchema)) body: AIQueryInput,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.aiService.naturalLanguageQuery(body.query, user.id);
  }
}
```

**ZodValidationPipe pattern** (`apps/api/src/common/pipes/zod-validation.pipe.ts` lines 1-21):
```typescript
import { PipeTransform, BadRequestException } from "@nestjs/common";
import { ZodSchema } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new BadRequestException({ message: "Validation failed", errors });
    }
    return result.data;
  }
}
```

**Gateway header pattern** (risk.gateway.ts lines 1-15):
```typescript
import { Logger } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ namespace: "/ws/risk", cors: true })
export class RiskGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RiskGateway.name);

  @WebSocketServer()
  server!: Server;
```

**SSE controller pattern to follow (NestJS @Sse()):**
```typescript
import { Controller, Sse, Query, Req, MessageEvent } from "@nestjs/common";
import { Observable } from "rxjs";
import type { FastifyRequest } from "fastify";

@Controller("ai-agent")
export class ChatController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Sse("chat")
  chat(@Query("message") message: string, @Req() req: FastifyRequest): Observable<MessageEvent> {
    const user = (req as any).user;
    return new Observable((subscriber) => {
      (async () => {
        for await (const event of this.orchestrator.executeQuery(message, {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role,
        })) {
          subscriber.next({ data: event });
          if (event.type === "done") subscriber.complete();
        }
      })().catch(err => subscriber.error(err));
    });
  }
}
```

**Apply to:** `sse/chat.gateway.ts`

---

### 🔷 Group 6: NestJS Event Emitter (@OnEvent Listeners)

**Analog:** `apps/api/src/modules/ai/ai.service.ts` (lines 334-448)

**Pattern:**
```typescript
@OnEvent("access.granted", { async: true })
async onAccessGranted(payload: {
    credentialId: string;
    userId: string;
    doorId: string;
    organizationId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const door = await this.prisma.door.findUnique({
        where: { id: payload.doorId },
        select: { name: true },
      });
      // ... process event ...
      await this.aiQueue.add("embed-event", { /* ... */ });
    } catch (err: any) {
      this.logger.error(`Failed to queue event: ${err.message}`);
    }
  }
```

**Apply to:** Event listeners in `orchestrator.service.ts`, `incident.agent.ts` (for D-28 auto-triggers: `incident.resolved`, `incident.escalated`, `risk.score-critical`, `pattern.detected`)

---

### 🔷 Group 7: Prisma Database Access

**Analog:** `apps/api/src/modules/ai/ai.service.ts`

**Prisma query pattern** (lines 39-43):
```typescript
const membership = await this.prisma.organizationMember.findFirst({
  where: { userId, isActive: true },
  select: { organizationId: true },
});
```

**Parameterized raw SQL pattern** (lines 315-324):
```typescript
await this.prisma.$queryRawUnsafe(
  `INSERT INTO event_embeddings (time, organization_id, event_type, event_id, summary, embedding)
   VALUES ($1::timestamptz, $2::uuid, $3::varchar, $4::uuid, $5::text, $6::vector)`,
  time, organizationId, eventType, eventId, summary, `[${embedding.join(",")}]`
);
```

**Apply to:** All agent services, skill implementations, `memory/conversation.memory.ts`, `tracing/agent-trace.service.ts`

---

### 🔷 Group 8: BullMQ Processor / Queue Jobs

**Analog:** `apps/api/src/modules/ai/ai.processor.ts` (all 91 lines)

**Pattern:**
```typescript
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("ai-summaries")
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "generate-summary":
        return this.handleGenerateSummary(job.data);
      case "embed-event":
        return this.handleEmbedEvent(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
```

**Queue injection pattern** (ai.module.ts lines 8-10):
```typescript
BullModule.registerQueue({ name: "ai-summaries" }),
```

**Queue usage in service** (ai.service.ts line 31):
```typescript
@InjectQueue("ai-summaries") private aiQueue: Queue,
```

**Queue add pattern** (ai.service.ts lines 353-359):
```typescript
await this.aiQueue.add("embed-event", {
  eventType: "access_granted",
  eventId: payload.credentialId,
  summary,
  organizationId: payload.organizationId,
  time: payload.timestamp,
});
```

**Apply to:** Repurposed `ai-summaries` queue for agent tasks. New queues if needed.

---

### 🔷 Group 9: NestJS Cron (Scheduled Tasks)

**Analog:** `apps/api/src/modules/risk/risk.service.ts` (lines 70-71)
**Analog:** `apps/api/src/modules/patterns/patterns.service.ts` (lines 122-180)

**Cron pattern** (risk.service.ts line 70):
```typescript
@Cron("*/5 * * * *")
async computeAllZoneScores() {
  // ...
}
```

**Pattern detection loop** (patterns.service.ts lines 122-180):
```typescript
@Cron("*/15 * * * *")
async detectPatterns() {
    this.logger.log("Starting pattern detection cycle...");
    let totalDetected = 0;

    for (const pattern of PATTERNS) {
      try {
        const results = await this.prisma.$queryRawUnsafe<
          Array<{ door_id?: string; reader_id?: string; organization_id: string; occurrence_count: number }>
        >(pattern.query, pattern.params[0], pattern.params[1]);

        for (const result of results) {
          // Redis dedup
          const dedupKey = `pattern:dedup:${pattern.id}:${deviceId}`;
          const alreadyReported = await this.redis.exists(dedupKey);
          if (alreadyReported) continue;

          // Write to hypertable
          await this.prisma.$queryRawUnsafe(
            `INSERT INTO detected_patterns (...) VALUES (...)`,
            result.organization_id, pattern.id, pattern.name, deviceType, deviceId, result.occurrence_count, pattern.severity
          );

          // Emit event
          this.eventEmitter.emit("pattern.detected", { /* ... */ });
        }
      } catch (err: any) {
        this.logger.error(`Pattern ${pattern.id} failed: ${err.message}`);
      }
    }
  }
```

**Apply to:** Preserved cron patterns in RiskService and PatternsService. New 3 patterns added to `patterns.service.ts` PATTERNS array.

---

### 🔷 Group 10: FastAPI Python Route (AI Preprocessor)

**Analog:** `services/ai-preprocessor/app/routes/inference.py` (lines 1-60)
**Analog:** `services/ai-preprocessor/app/routes/anpr.py` (lines 1-60)

**Route pattern** (inference.py lines 1-11):
```python
import base64
import io
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from PIL import Image

from app.config import settings

router = APIRouter()
```

**Pydantic request/response model pattern** (inference.py lines 13-36):
```python
class AnalyzeRequest(BaseModel):
    camera_id: str
    image_base64: str
    prompts: list[PromptInput] = []
    timestamp: str | None = None

class AnalyzeResponse(BaseModel):
    detections: list[DetectionResult]
```

**Async route handler pattern** (anpr.py lines 44-60):
```python
@router.post("/anpr", response_model=ANPRResponse)
async def recognize_plate(request: ANPRRequest):
    start = time.time()

    try:
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data")

    # ... processing ...
```

**Lazy model loading pattern** (anpr.py lines 14-24):
```python
_ocr = None

def get_ocr():
    global _ocr
    if _ocr is None:
        logger.info("Initializing PaddleOCR (first call may be slow)...")
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(use_angle_cls=True, lang='en')
    return _ocr
```

**Async HTTP call to Ollama pattern** (inference.py lines 38-50):
```python
async def call_ollama_vlm(image_b64: str, prompt: str, model: str = "moondream") -> str:
    async with httpx.AsyncClient(timeout=300) as client:
        payload = {
            "model": model,
            "prompt": prompt,
            "images": [image_b64],
            "stream": False,
            "options": {"temperature": 0.1},
        }
        resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
```

**Main.py router registration pattern** (main.py lines 20-22):
```python
app.include_router(health.router)
app.include_router(inference.router, prefix=settings.API_V1_PREFIX)
app.include_router(anpr.router, prefix=settings.API_V1_PREFIX)
```

**Apply to:**
- `routes/detection.py` → Follow `anpr.py` pattern: fastapi.APIRouter, Pydantic BaseModel, async handler
- `routes/audio.py` → Same pattern
- `models/detector.py` → Follow lazy-load `get_ocr()` pattern for YOLOv12 model
- `models/tracker.py` → Same lazy-load pattern for ByteTrack
- `models/audio_classifier.py` → Same lazy-load pattern for YAMNet
- `models/transcriber.py` → Same lazy-load pattern for Faster-Whisper

---

### 🔷 Group 11: Dashboard Page (Next.js App Router)

**Analog:** `apps/dashboard/app/(dashboard)/ia/page.tsx` (all 591 lines) — main replacement page
**Analog:** `apps/dashboard/app/(dashboard)/risque/page.tsx` (all 496 lines) — charts + data fetch pattern
**Analog:** `apps/dashboard/app/(dashboard)/maintenance/page.tsx` (lines 1-50) — table pattern

**Client component directive** (always first line):
```typescript
"use client";
```

**Import pattern** (ia/page.tsx lines 1-32):
```typescript
import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";
import { useAuth } from "@/lib/use-auth";
import { /* API functions */ } from "@/lib/api";
import { /* lucide icons */ } from "lucide-react";
```

**Page component pattern** (ia/page.tsx line 44, risque/page.tsx line 107):
```typescript
export default function AiAssistantPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
```

**State pattern** (ia/page.tsx lines 48-67):
```typescript
const [activeTab, setActiveTab] = useState<Tab>("query");
const [status, setStatus] = useState<AIStatusDto | null>(null);
const [statusLoading, setStatusLoading] = useState(true);
const [queryInput, setQueryInput] = useState("");
const [queryLoading, setQueryLoading] = useState(false);
```

**API call pattern** (ia/page.tsx lines 111-135):
```typescript
try {
  const result = await aiQuery(q);
  // ... set state with result
} catch (err: any) {
  // ... set error state
  setQueryMessages((prev) => [...prev, { /* error message */ }]);
} finally {
  setQueryLoading(false);
}
```

**Auto-refresh pattern** (risque/page.tsx lines 157-163):
```typescript
useEffect(() => {
  const interval = setInterval(() => { loadData(); }, 60000);
  return () => clearInterval(interval);
}, [loadData]);
```

**Loading skeleton pattern** (risque/page.tsx lines 57-82):
```typescript
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Recharts chart pattern** (risque/page.tsx lines 281-312):
```typescript
<div className="h-[400px]">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={scores} layout="vertical" margin={{ left: 100 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
      <XAxis type="number" domain={[0, 100]} className="text-xs" tick={{ fill: "currentColor" }} />
      <YAxis type="category" dataKey="zoneName" className="text-xs" tick={{ fill: "currentColor" }} width={90} />
      <Tooltip formatter={(value: number) => [value, "Score"]} />
      <Bar dataKey="smoothedScore" radius={[0, 4, 4, 0]} maxBarSize={20}>
        {scores.map((entry, index) => (
          <Cell key={index} fill={getScoreColor(entry.smoothedScore)} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
```

**SSE streaming pattern** (new — based on EventSource API, consumed in `command-center/page.tsx`):
```typescript
// SSE consumption (browser-native EventSource)
const eventSource = new EventSource(`/api/ai-agent/chat?message=${encodeURIComponent(message)}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "token") {
    setStreamingResponse(prev => prev + data.content);
  } else if (data.type === "done") {
    eventSource.close();
  }
};
eventSource.onerror = () => { eventSource.close(); };
```

**Apply to:**
- `command-center/page.tsx` → Full chat + camera grid + risk gauge layout. Three-panel: chat (center), camera grid (right), risk/agent status (left). SSE streaming for agent responses. Reuse Phase 6 `GlassCard`, `MetricHero`, `Sparkline` components.
- `patterns/page.tsx` → Follow `maintenance/page.tsx` table pattern + `risque/page.tsx` chart pattern. 8 pattern types with trend visualization.

---

### 🔷 Group 12: Mobile Screen (Expo Router)

**Analog:** `apps/mobile/app/(tabs)/more.tsx` (all 126 lines)

**Import pattern** (more.tsx lines 1-11):
```typescript
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { colors } from "@repo/design";
import { useRouter } from "expo-router";
import { MessageSquareText, MapPin, Settings, ChevronRight } from "lucide-react-native";
```

**Screen component pattern** (more.tsx lines 53-77):
```typescript
export default function MoreScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Plus</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.menuRow}
              onPress={() => router.push(item.route)}
            >
              <View style={styles.menuIcon}>{item.icon}</View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={18} color={colors.dark.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

**StyleSheet pattern** (more.tsx lines 80-125):
```typescript
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  headerBar: {
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1, borderBottomColor: colors.dark.border,
  },
  title: { fontSize: 20, fontWeight: "600", color: colors.dark.text },
  scroll: { padding: 16 },
  menuList: {
    backgroundColor: colors.dark.elevated, borderRadius: 14,
    borderWidth: 1, borderColor: colors.dark.border, overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.dark.border,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.dark.surface,
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.dark.text },
});
```

**Tab layout pattern** (more.tsx updates chat route):
```typescript
// Update menu item route in more.tsx:
{ id: "chat", label: "Chat IA", icon: <MessageSquareText size={22} color={colors.dark.text} />, route: "/(tabs)/more/chat" },
```

**Auth context import** (for chat — from `apps/mobile/lib/auth-context.tsx`):
```typescript
import { useAuth } from "@/lib/auth-context";
```

**Mobile API call pattern** (`apps/mobile/lib/api.ts` lines 1-2):
```typescript
import { fetchWithAuth } from "@/lib/auth-client";
import { API_URL as API_BASE } from "@/lib/config";
```

**Apply to:**
- `apps/mobile/app/(tabs)/more/chat.tsx` → Full chat screen with SSE streaming (adapted for React Native), voice input (Faster-Whisper transcription). Guard-first UI: large touch targets, dark mode. Follow `more.tsx` StyleSheet pattern with `colors.dark.*` tokens. Update `more.tsx` route from `/chat` to `/(tabs)/more/chat`.

---

### 🔷 Group 13: Shared Zod Schemas

**Analog:** `packages/shared/src/schemas/ai.schema.ts` (all 16 lines)

**Pattern:**
```typescript
import { z } from "zod";

export const aiQuerySchema = z.object({
  query: z.string().min(1, "Query is required").max(500, "Query too long"),
});
export type AIQueryInput = z.infer<typeof aiQuerySchema>;

export const aiAssistantSchema = z.object({
  question: z.string().min(1, "Question is required").max(1000, "Question too long"),
});
export type AIAssistantInput = z.infer<typeof aiAssistantSchema>;
```

**Barrel export pattern** (`packages/shared/src/index.ts` lines 1-3):
```typescript
export { aiQuerySchema, aiAssistantSchema, aiSummarizeSchema } from "./schemas/ai.schema";
export type { AIQueryInput, AIAssistantInput, AISummarizeInput } from "./schemas/ai.schema";
```

**Apply to:** New schemas for agent chat input (`agentChatSchema`), SSE events (`sseEventSchema`), tool call params. Add to shared package and export from barrel.

---

### 🔷 Group 14: Dashboard API Client Extension

**Analog:** `apps/dashboard/lib/api.ts` (lines 1481-1521)

**API function pattern:**
```typescript
export async function aiQuery(query: string): Promise<AIQueryResultDto> {
  const res = await fetchWithAuth(`${API_URL}/api/ai/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la requête IA");
  }
  return res.json();
}
```

**Type interface pattern** (api.ts lines 1437-1471):
```typescript
export interface AIQueryResultDto {
  query: string;
  spec: AIQuerySpecDto;
  results: TimelineEntryDto[];
  summary: string;
}
```

**SSE connection helper** (new pattern to add):
```typescript
export function createAgentChatStream(
  message: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
): () => void {
  const token = getAccessToken();
  const url = `${API_URL}/api/ai-agent/chat?message=${encodeURIComponent(message)}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "token") onToken(data.content);
    else if (data.type === "done") { onDone(); eventSource.close(); }
    else if (data.type === "error") { onError(new Error(data.content)); eventSource.close(); }
  };
  eventSource.onerror = () => { onError(new Error("SSE connection failed")); eventSource.close(); };

  return () => eventSource.close(); // cleanup function
}
```

**Apply to:** `apps/dashboard/lib/api.ts` — Add `agentChat`, `agentStatus`, `explainRisk` functions, SSE helper. Add DTO types for agent responses. Same pattern for `apps/mobile/lib/api.ts`.

---

### 🔷 Group 15: Configuration Files

**Analog:** `apps/api/src/config/configuration.ts` (all 72 lines)
**Analog:** `apps/api/src/config/validation.ts` (all 39 lines)

**Config factory pattern** (configuration.ts):
```typescript
export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  ai: {
    ollamaModel: process.env.OLLAMA_MODEL || 'moondream',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    summaryModel: process.env.OLLAMA_SUMMARY_MODEL || 'moondream',
  },

  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  // ... more keys
});
```

**Joi validation pattern** (validation.ts):
```typescript
export const validationSchema = Joi.object({
  OLLAMA_BASE_URL: Joi.string().default('http://localhost:11434'),
  AI_PREPROCESSOR_URL: Joi.string().default('http://localhost:8000'),
  // ... more
});
```

**New keys to add** (configuration.ts):
```typescript
vllmUrl: process.env.VLLM_URL || 'http://localhost:8000',
ai: {
  // ... existing ...
  qwenVlModel: process.env.QWEN_VL_MODEL || 'qwen-vl',
  yoloModel: process.env.YOLO_MODEL || 'yolov12n',
  whisperModel: process.env.WHISPER_MODEL || 'medium',
},
qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
```

**Apply to:** Both configuration files. Add new env vars to `.env.example` and both Docker Compose files.

---

### 🔷 Group 16: Prisma Schema Extension

**Analog:** `apps/api/prisma/schema.prisma` (existing model patterns)

**Model pattern** (follow existing pattern with TimescaleDB hypertable annotations):
```prisma
model AgentTrace {
  id            String   @id @default(uuid()) @db.Uuid
  time          DateTime @default(now()) @db.Timestamptz()
  organizationId String  @db.Uuid
  userId        String   @db.Uuid
  agentName     String
  toolName      String
  input         Json
  output        Json?
  durationMs    Int
  success       Boolean
  errorMessage  String?
}
```

**Apply to:** Migration file for `agent_traces` table (consider TimescaleDB hypertable for time-series performance).

---

### 🔷 Group 17: Docker Compose Service Addition

**Analog:** `docker-compose.yml` (existing `ai-preprocessor` service pattern, lines 84-98)

**Service pattern:**
```yaml
ai-preprocessor:
  build:
    context: ./services/ai-preprocessor
    dockerfile: Dockerfile
  container_name: oversight-ai-preprocessor
  restart: unless-stopped
  extra_hosts:
    - "host.docker.internal:host-gateway"
  environment:
    OLLAMA_BASE_URL: http://host.docker.internal:11434
  healthcheck:
    test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')\" || exit 1"]
    interval: 15s
    timeout: 5s
    retries: 3
```

**Qdrant service to add:**
```yaml
qdrant:
  image: qdrant/qdrant:latest
  container_name: oversight-qdrant
  restart: unless-stopped
  expose:
    - "6333"
    - "6334"
  volumes:
    - qdrant_data:/qdrant/storage
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:6333/healthz || exit 1"]
    interval: 15s
    timeout: 5s
    retries: 3
```

**Apply to:** Both `docker-compose.yml` and `docker-compose.prod.yml`

---

### 🔷 Group 18: Navigation Config Update

**Analog:** `apps/dashboard/lib/nav-config.ts` (all 133 lines)

**Add to nav groups:**
```typescript
// In "Outils" group, replace:
{ label: "Assistant IA", href: "/ia", icon: MessageSquare, minRole: null },
// With:
{ label: "Command Center", href: "/command-center", icon: MessageSquare, minRole: null },
// Add under "Sécurité" group:
{ label: "Patterns", href: "/patterns", icon: Repeat, minRole: "SUPERVISOR" as Role },
// Keep existing:
{ label: "Risques", href: "/risque", icon: Gauge, minRole: "SUPERVISOR" as Role },
```

---

### 🔷 Group 19: AppModule Registration

**Analog:** `apps/api/src/app.module.ts` (lines 51-80)

**Import pattern:**
```typescript
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';

@Module({
  imports: [
    // ... existing imports ...
    AiAgentModule,  // Add here (before or after AiModule)
  ],
```

**Guard registration pattern** (app.module.ts lines 42-44):
```typescript
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
// ... add agent-specific guards if global
```

---

## Shared Patterns (Cross-Cutting)

### Authentication / RBAC
**Source:** `apps/api/src/common/guards/roles.guard.ts` (all 42 lines)
**Source:** `apps/api/src/common/decorators/roles.decorator.ts` (all 4 lines)
**Apply to:** All controller endpoints in `sse/chat.gateway.ts`, any new REST endpoints

**Pattern:**
```typescript
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("ai-agent")
export class ChatController {
  @Sse("chat")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  chat(/* ... */) { /* ... */ }
}
```

### Input Validation (Zod)
**Source:** `apps/api/src/common/pipes/zod-validation.pipe.ts` (all 21 lines)
**Source:** `packages/shared/src/schemas/ai.schema.ts` (all 16 lines)
**Apply to:** All agent chat input, tool call parameters, SSE query params

**Pattern:**
```typescript
@Body(new ZodValidationPipe(agentChatSchema)) body: AgentChatInput,
```

### Error Handling
**Source:** `apps/api/src/common/filters/all-exceptions.filter.ts` (all 75 lines)
**Apply to:** Global — all new endpoints automatically covered.

### Event Emitter Communication
**Source:** `apps/api/src/modules/ai/ai.service.ts` (lines 334-448)
**Apply to:** Inter-agent communication, auto-triggers (incident.resolved → summary, risk.score-critical → explanation, pattern.detected → notification)

### Configuration Injection
**Source:** `apps/api/src/config/configuration.ts` (all 72 lines)
**Apply to:** All services that need config values

**Pattern:**
```typescript
constructor(private config: ConfigService) {}
// Usage:
this.config.get<string>("ai.qwenVlModel", "qwen-vl");
```

### Prisma Tenant Scoping
**Source:** `apps/api/src/common/guards/tenant-isolation.guard.ts`
**Apply to:** All agent DB queries — automatically scoped via existing Prisma Client Extension (Phase 4).

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `mcp/events.mcp.server.ts` | service | MCP protocol | No existing MCP server in codebase. Use `@modelcontextprotocol/sdk` — RESEARCH.md Pattern 3 (lines 43-77) |
| `mcp/doors.mcp.server.ts` | service | MCP protocol | Same as above |
| `mcp/risk.mcp.server.ts` | service | MCP protocol | Same as above |
| `mcp/cameras.mcp.server.ts` | service | MCP protocol | Same as above |
| `sse/chat.gateway.ts` | controller | SSE streaming | No existing `@Sse()` pattern in codebase. Use RESEARCH.md Pattern 3 (lines 347-383). Verify Fastify compatibility per Pitfall 5 (lines 731-734). |

**MCP Server pattern (from RESEARCH.md):**
```typescript
// Standard MCP tool definition via @modelcontextprotocol/sdk
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "events-mcp", version: "1.0.0" });

server.tool(
  "search_events",
  "Search security events with filters",
  { event_types: z.array(z.string()), zone: z.string().optional(), limit: z.number().default(20) },
  async ({ event_types, zone, limit }) => {
    // Execute search via EventSearchAgent
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  }
);
```

**SSE verification (Pitfall 5 from RESEARCH.md, lines 731-734):**
> Verify during Wave 1 spike whether `@Sse()` decorator works with Fastify adapter. If not, use raw `reply.raw.writeHead(200, SSE_HEADERS)` with `reply.raw.write()` for each event.

---

## Metadata

**Analog search scope:** `apps/api/src/modules/*`, `apps/api/src/common/*`, `apps/api/src/config/*`, `apps/dashboard/*`, `apps/mobile/*`, `packages/shared/src/*`, `services/ai-preprocessor/*`
**Files scanned:** 30+ source files across NestJS API, Next.js dashboard, Expo mobile, Python preprocessor, shared package, and infrastructure config
**Pattern extraction date:** 2026-07-16
**Confidence:** HIGH — All primary patterns verified against live codebase. SSE and MCP patterns rely on RESEARCH.md + standard library documentation. One LOW-confidence item: NestJS `@Sse()` with Fastify (verify during Wave 1 spike).
