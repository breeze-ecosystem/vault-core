import { z } from "zod";

export const aiQuerySchema = z.object({
  query: z.string().min(1, "Query is required").max(500, "Query too long"),
});
export type AIQueryInput = z.infer<typeof aiQuerySchema>;

export const aiAssistantSchema = z.object({
  question: z.string().min(1, "Question is required").max(1000, "Question too long"),
});
export type AIAssistantInput = z.infer<typeof aiAssistantSchema>;

export const aiSummarizeSchema = z.object({
  incidentId: z.string().uuid("Invalid incident ID"),
});
export type AISummarizeInput = z.infer<typeof aiSummarizeSchema>;
