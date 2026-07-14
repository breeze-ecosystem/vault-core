import { z } from "zod";

const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  startMinute: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMinute: z.number().int().min(0).max(59),
});

const credentialBaseSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["BADGE", "PIN", "MOBILE", "QR"]),
  badgeNumber: z.string().min(1).optional(),
  pinHash: z.string().optional(),
  qrSeed: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
});

export const createCredentialSchema = credentialBaseSchema.refine(
  (data) => {
    if (data.type === "BADGE") return !!data.badgeNumber;
    if (data.type === "PIN") return !!data.pinHash;
    if (data.type === "QR") return !!data.qrSeed;
    return true; // MOBILE has no required fields in Phase 1
  },
  { message: "Type-specific field is required" },
);

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;

export const updateCredentialSchema = credentialBaseSchema.partial();
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;

export const createAccessLevelSchema = z.object({
  credentialId: z.string().uuid(),
  zoneId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  priority: z.number().int().optional().default(0),
});

export type CreateAccessLevelInput = z.infer<typeof createAccessLevelSchema>;

export const createScheduleSchema = z.object({
  name: z.string().min(1).max(128),
  zoneId: z.string().uuid(),
  entries: z.array(scheduleEntrySchema).min(1),
  holidayOverride: z.enum(["none", "allowed", "denied"]).optional().default("none"),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

export const updateScheduleSchema = createScheduleSchema.partial();
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

export const createZoneSchema = z.object({
  name: z.string().min(1).max(128),
  siteId: z.string().uuid(),
  description: z.string().optional(),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const createDoorSchema = z.object({
  name: z.string().min(1).max(128),
  siteId: z.string().uuid(),
  zoneId: z.string().uuid(),
  location: z.string().optional(),
  controllerId: z.string().optional(),
});

export type CreateDoorInput = z.infer<typeof createDoorSchema>;

export const createCameraDoorMapSchema = z.object({
  cameraId: z.string().uuid(),
  doorId: z.string().uuid(),
  angle: z.string().optional(),
  priority: z.number().int().optional().default(0),
});

export type CreateCameraDoorMapInput = z.infer<typeof createCameraDoorMapSchema>;
