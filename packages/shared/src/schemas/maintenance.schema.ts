import { z } from "zod";

export const createMaintenanceTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  organizationId: z.string().uuid(),
  deviceType: z.enum(["camera", "reader", "controller"]),
  deviceId: z.string().uuid(),
  deviceName: z.string().optional(),
});

export type CreateMaintenanceTicketInput = z.infer<typeof createMaintenanceTicketSchema>;

export const maintenanceQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  deviceType: z.enum(["camera", "reader", "controller"]).optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type MaintenanceQueryInput = z.infer<typeof maintenanceQuerySchema>;
