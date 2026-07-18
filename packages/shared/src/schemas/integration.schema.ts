import { z } from "zod";

// ─── Phase 4: Fire Alarm Integration (BAS-43) ───

export const fireAlarmSchema = z.object({
  siteId: z.string().min(1),
  zone: z.string().min(1),
  sensorId: z.string().min(1),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  message: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type FireAlarmInput = z.infer<typeof fireAlarmSchema>;

// ─── Phase 4: BMS Integration (BAS-44) ───

export const bmsEventSchema = z.object({
  siteId: z.string().min(1),
  zone: z.string().min(1),
  eventType: z.enum([
    "hvac_temperature",
    "hvac_humidity",
    "emergency_lighting",
    "fire_door_release",
  ]),
  value: z.number().optional(),
  unit: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type BmsEventInput = z.infer<typeof bmsEventSchema>;
