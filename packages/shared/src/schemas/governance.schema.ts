import { z } from "zod";

export const createRetentionPolicySchema = z.object({
  eventType: z.string().min(1, "Event type is required"),
  tableType: z.enum(["timescaledb", "prisma"]),
  retentionDays: z.number().int().min(1).max(3650),
  enabled: z.boolean().optional(),
});

export const updateRetentionPolicySchema = z.object({
  retentionDays: z.number().int().min(1).max(3650).optional(),
  enabled: z.boolean().optional(),
});

export type CreateRetentionPolicyInput = z.infer<typeof createRetentionPolicySchema>;
export type UpdateRetentionPolicyInput = z.infer<typeof updateRetentionPolicySchema>;
