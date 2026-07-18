import type { z } from "zod";
import {
  faceWhitelistSchema,
  detectionZoneSchema,
  geofencingConfigSchema,
  dndScheduleSchema,
  alertChannelConfigSchema,
  recordingConfigSchema,
} from "../schemas/vision";

// ─── FaceWhitelist ───

export type FaceWhitelist = z.infer<typeof faceWhitelistSchema> & {
  id: string;
  organizationId: string;
  embeddingBase64?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── DetectionZone ───

export type DetectionZone = z.infer<typeof detectionZoneSchema> & {
  id: string;
  cameraId: string;
  createdAt: string;
  updatedAt: string;
};

// ─── StreamShare ───

export interface StreamShare {
  id: string;
  organizationId: string;
  token: string;
  cameraIds: string[];
  durationHours: number;
  expiresAt: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  createdById: string;
  lastAccessedAt?: string | null;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── GeofencingConfig ───

export type GeofencingConfig = z.infer<typeof geofencingConfigSchema> & {
  id: string;
  organizationId: string;
  manualArmUntil?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── GeofencingArmStatus ───

export type GeofencingArmStatus = "ARMED" | "DISARMED" | "MANUAL_ARM" | "MANUAL_DISARM";

// ─── DNDSchedule ───

export type DNDSchedule = z.infer<typeof dndScheduleSchema> & {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

// ─── DNDDaySchedule ───

export interface DNDDaySchedule {
  start: string;
  end: string;
}

// ─── AlertChannelConfig ───

export interface AlertChannelConfig {
  id: string;
  organizationId: string;
  channel: "PUSH" | "SMS" | "WHATSAPP";
  enabled: boolean;
  configJson: Record<string, unknown>;
  modemDetected?: boolean | null;
  whatsappConnected?: boolean | null;
  whatsappQrCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── RecordingConfig ───

export type RecordingConfig = z.infer<typeof recordingConfigSchema> & {
  id: string;
  organizationId: string;
  estimatedStorageGb?: number | null;
  createdAt: string;
  updatedAt: string;
};
