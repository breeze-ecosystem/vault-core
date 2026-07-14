import { z } from "zod";

/**
 * Query params for pattern detection endpoints.
 */
export const patternsQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  deviceType: z.enum(["door", "reader", "camera", "controller"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  resolved: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export type PatternsQueryParams = z.infer<typeof patternsQuerySchema>;
