import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface TraceToolCallParams {
  organizationId: string;
  userId: string;
  agentName: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * AgentTraceService writes every tool call to the agent_traces table.
 *
 * Tracing is fail-transparent per D-12: errors in tracing never throw to
 * the caller — they are logged and swallowed so agent execution continues.
 *
 * The agent_traces table provides evaluation infrastructure for D-38
 * (Quantitative Evaluation): success rate, response latency, and accuracy
 * per agent per organization — all queryable via the agent_traces table.
 */
@Injectable()
export class AgentTraceService {
  private readonly logger = new Logger(AgentTraceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trace a tool call to the agent_traces table.
   *
   * Non-blocking: wrapped in try/catch so tracing failures never
   * break agent execution (D-12). Errors logged via Logger.warn().
   */
  async traceToolCall(params: TraceToolCallParams): Promise<void> {
    try {
      // input/output are JSON fields — use safe serialization to satisfy
      // Prisma's Json type constraint while preserving structured data.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeInput = params.input as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeOutput = params.output as any;

      await this.prisma.agentTrace.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          agentName: params.agentName,
          toolName: params.toolName,
          input: safeInput ?? undefined,
          output: safeOutput ?? null,
          durationMs: params.durationMs,
          success: params.success,
          errorMessage: params.errorMessage ?? null,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to trace tool call '${params.toolName}' for agent '${params.agentName}': ${message}`,
      );
      // Fail-transparent: never throw to caller per D-12
    }
  }
}
