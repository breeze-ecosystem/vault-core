import { z } from "zod";

/**
 * Query params for risk score endpoints.
 */
export const riskQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type RiskQueryParams = z.infer<typeof riskQuerySchema>;
