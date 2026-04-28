import { z } from "zod";

export const createAlertSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  cameraId: z.string().uuid("Camera ID invalide"),
  snapshotUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateAlertSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).optional(),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE"]).optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
