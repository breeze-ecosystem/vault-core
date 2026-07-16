import type { ZodTypeAny } from "zod";

export interface AgentContext {
  userId: string;
  organizationId: string;
  role: string;
  language?: string;
}

export interface AgentResult {
  content: string;
  toolCalls: ToolCallRecord[];
  metadata: Record<string, unknown>;
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  output?: unknown;
  error?: string;
}

export interface ToolCallDefinition {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
}

export interface SkillDefinition {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
}
