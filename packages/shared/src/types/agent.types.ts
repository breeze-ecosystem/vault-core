export interface AgentChatInput {
  message: string;
}

export interface AgentChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
}

export interface SSEEvent {
  type: "thinking" | "token" | "tool_call" | "tool_result" | "agent_switch" | "error" | "done";
  content?: string;
  agent?: string;
  tool?: string;
}

export interface AgentStatus {
  agentName: string;
  status: "idle" | "thinking" | "responding" | "error";
}

export interface RiskExplanation {
  zoneId: string;
  score: number;
  factors: string[];
  summary: string;
}

export interface PatternDetail {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  relatedIncidents: string[];
}

export interface AgentTraceEntry {
  timestamp: string;
  agent: string;
  action: string;
  input?: unknown;
  output?: unknown;
  error?: string;
}
