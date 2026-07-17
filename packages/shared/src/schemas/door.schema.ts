import { z } from "zod";

export const updateAlertConfigSchema = z.object({
  heldOpenThresholdMs: z.number().int().min(30000).max(300000).optional(),
});

export type UpdateAlertConfigInput = z.infer<typeof updateAlertConfigSchema>;

export const emergencyOverrideSchema = z.object({
  reason: z.string().min(1).max(512).optional(),
});

export type EmergencyOverrideInput = z.infer<typeof emergencyOverrideSchema>;

export const doorCommandSchema = z.object({
  command: z.enum(["lock", "unlock"]),
});

/**
 * createDoorMonitoringSchema — Phase 2 door enrollment schema.
 * Named with "Monitoring" suffix to avoid collision with the existing
 * createDoorSchema exported from access.schema.ts (line 66) which is
 * already re-exported from the barrel (index.ts line 61).
 * The two schemas serve different contexts (access control vs door monitoring)
 * but share identical shapes.
 */
export const createDoorMonitoringSchema = z.object({
  name: z.string().min(1).max(128),
  siteId: z.string().uuid(),
  zoneId: z.string().uuid(),
  location: z.string().optional(),
  controllerId: z.string().optional(),
});

export type DoorCommandInput = z.infer<typeof doorCommandSchema>;
export type CreateDoorMonitoringInput = z.infer<typeof createDoorMonitoringSchema>;
