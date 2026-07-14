import { z } from "zod";

export const updateAlertConfigSchema = z.object({
  heldOpenThresholdMs: z.number().int().min(30000).max(300000).optional(),
});

export type UpdateAlertConfigInput = z.infer<typeof updateAlertConfigSchema>;

export const emergencyOverrideSchema = z.object({
  reason: z.string().min(1).max(512).optional(),
});

export type EmergencyOverrideInput = z.infer<typeof emergencyOverrideSchema>;
