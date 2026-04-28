import { z } from "zod";

export const createCameraSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  rtspUrl: z.string().url("URL RTSP invalide"),
  siteId: z.string().uuid("Site ID invalide"),
  resolution: z.string().optional(),
  fps: z.number().int().min(1).max(120).default(25),
  isRecording: z.boolean().default(false),
});

export const updateCameraSchema = z.object({
  name: z.string().min(1).optional(),
  rtspUrl: z.string().url().optional(),
  siteId: z.string().uuid().optional(),
  resolution: z.string().optional(),
  fps: z.number().int().min(1).max(120).optional(),
  isRecording: z.boolean().optional(),
  status: z.enum(["ONLINE", "OFFLINE", "MAINTENANCE", "DEGRADED"]).optional(),
});

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;
