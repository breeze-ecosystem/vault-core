import { z } from "zod";

// ─── FaceWhitelist ───

export const faceWhitelistSchema = z.object({
  name: z.string().min(1).max(100),
  imageBase64: z.string(),
});

export const updateFaceWhitelistSchema = faceWhitelistSchema.partial();

// ─── DetectionZone ───

export const detectionZoneSchema = z.object({
  name: z.string().min(1).max(100),
  polygon: z.array(z.array(z.number()).length(2)).min(3),
  isActive: z.boolean().optional(),
  sensitivity: z.number().min(0).max(1).optional(),
});

export const updateDetectionZoneSchema = detectionZoneSchema.partial();

// ─── StreamShare ───

export const createStreamShareSchema = z.object({
  cameraIds: z.array(z.string().uuid()).min(1),
  durationHours: z.union([z.literal(1), z.literal(6), z.literal(24), z.number()]),
});

// ─── GeofencingConfig ───

export const geofencingConfigSchema = z.object({
  enabled: z.boolean().optional(),
  trustedSsids: z.array(z.string()).optional(),
  armDelayMinutes: z.number().min(1).max(30).optional(),
  absenceTimeoutMinutes: z.number().min(5).max(30).optional(),
  reinforcedSensitivity: z.boolean().optional(),
  manualArm: z.boolean().optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleJson: z.any().optional(),
});

export const updateGeofencingConfigSchema = geofencingConfigSchema.partial();

// ─── DNDSchedule ───

export const dndScheduleSchema = z.object({
  enabled: z.boolean().optional(),
  scheduleJson: z
    .record(
      z
        .object({
          start: z.string(),
          end: z.string(),
        })
        .nullable(),
    )
    .optional(),
  criticalOverride: z.boolean().optional(),
});

export const updateDndScheduleSchema = dndScheduleSchema.partial();

// ─── AlertChannelConfig ───

export const alertChannelConfigSchema = z.object({
  channel: z.enum(["PUSH", "SMS", "WHATSAPP"]),
  enabled: z.boolean().optional(),
  configJson: z.any().optional(),
});

// ─── RecordingConfig ───

export const recordingConfigSchema = z.object({
  retentionDays: z.union([z.literal(7), z.literal(15), z.literal(30)]).optional(),
  codec: z.enum(["h264", "h265"]).optional(),
  storagePath: z.string().optional(),
});

export const updateRecordingConfigSchema = recordingConfigSchema.partial();

// ─── Inferred Types ───

export type FaceWhitelistInput = z.infer<typeof faceWhitelistSchema>;
export type UpdateFaceWhitelistInput = z.infer<typeof updateFaceWhitelistSchema>;
export type DetectionZoneInput = z.infer<typeof detectionZoneSchema>;
export type UpdateDetectionZoneInput = z.infer<typeof updateDetectionZoneSchema>;
export type CreateStreamShareInput = z.infer<typeof createStreamShareSchema>;
export type GeofencingConfigInput = z.infer<typeof geofencingConfigSchema>;
export type UpdateGeofencingConfigInput = z.infer<typeof updateGeofencingConfigSchema>;
export type DNDScheduleInput = z.infer<typeof dndScheduleSchema>;
export type UpdateDNDScheduleInput = z.infer<typeof updateDndScheduleSchema>;
export type AlertChannelConfigInput = z.infer<typeof alertChannelConfigSchema>;
export type RecordingConfigInput = z.infer<typeof recordingConfigSchema>;
export type UpdateRecordingConfigInput = z.infer<typeof updateRecordingConfigSchema>;
