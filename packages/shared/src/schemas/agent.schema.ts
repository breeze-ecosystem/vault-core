import { z } from "zod";

export const agentChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
});
export type AgentChatInput = z.infer<typeof agentChatSchema>;

export const agentSseEventSchema = z.object({
  type: z.enum([
    "thinking",
    "token",
    "tool_call",
    "tool_result",
    "agent_switch",
    "error",
    "done",
  ]),
  content: z.string().optional(),
  agent: z.string().optional(),
  tool: z.string().optional(),
});
export type AgentSseEvent = z.infer<typeof agentSseEventSchema>;

export const riskExplainSchema = z.object({
  zoneId: z.string().uuid("Invalid zone ID"),
});
export type RiskExplainInput = z.infer<typeof riskExplainSchema>;
