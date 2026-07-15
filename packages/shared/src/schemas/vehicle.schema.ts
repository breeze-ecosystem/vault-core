import { z } from "zod";

export const createVehicleListEntrySchema = z.object({
  type: z.enum(["allowlist", "blocklist"]),
  plate: z.string().min(1).max(20).transform((v) => v.toUpperCase().trim()),
  organizationId: z.string().uuid(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateVehicleListEntrySchema = z.object({
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const vehicleEventQuerySchema = z.object({
  plate: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  decision: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export type CreateVehicleListEntryInput = z.infer<typeof createVehicleListEntrySchema>;
export type UpdateVehicleListEntryInput = z.infer<typeof updateVehicleListEntrySchema>;
export type VehicleEventQueryInput = z.infer<typeof vehicleEventQuerySchema>;
