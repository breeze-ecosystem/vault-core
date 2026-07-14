import { z } from "zod";

export const equipmentQuerySchema = z.object({
  deviceId: z.string().optional(),
  siteId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export type EquipmentQueryInput = z.infer<typeof equipmentQuerySchema>;
