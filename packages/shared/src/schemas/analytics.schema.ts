import { z } from "zod";

export const analyticsQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  granularity: z.enum(["hourly", "daily"]).optional().default("hourly"),
});

export type AnalyticsQueryParams = z.infer<typeof analyticsQuerySchema>;

export const intrusionEventSchema = z.object({
  id: z.string().uuid(),
  zoneId: z.string().uuid(),
  siteId: z.string().uuid(),
  doorId: z.string().uuid().optional(),
  detectedAt: z.string().datetime(),
  cameraId: z.string().uuid().optional(),
  snapshotUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1),
  status: z.string(),
});
