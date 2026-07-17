import { z } from "zod";

export const createCameraSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  rtspUrl: z.string().min(1, "URL RTSP requise"),
  siteId: z.string().uuid("Site ID invalide"),
  resolution: z.string().optional(),
  fps: z.number().int().min(1).max(120).default(25),
  captureInterval: z.number().int().min(1).max(60).default(5),
  isRecording: z.boolean().default(false),
});

export const updateCameraSchema = z.object({
  name: z.string().min(1).optional(),
  rtspUrl: z.string().min(1).optional(),
  siteId: z.string().uuid().optional(),
  resolution: z.string().optional(),
  fps: z.number().int().min(1).max(120).optional(),
  captureInterval: z.number().int().min(1).max(60).optional(),
  isRecording: z.boolean().optional(),
  status: z.enum(["ONLINE", "OFFLINE", "MAINTENANCE", "DEGRADED"]).optional(),
});

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;

export const ptzContinuousSchema = z.object({
  pan: z.number().min(-1).max(1),
  tilt: z.number().min(-1).max(1),
  zoom: z.number().min(-1).max(1),
});

export const ptzGotoPresetSchema = z.object({
  presetToken: z.string().min(1),
});

export const ptzSavePresetSchema = z.object({
  name: z.string().min(1).max(64),
});

export type PtzContinuousInput = z.infer<typeof ptzContinuousSchema>;
export type PtzGotoPresetInput = z.infer<typeof ptzGotoPresetSchema>;
export type PtzSavePresetInput = z.infer<typeof ptzSavePresetSchema>;
