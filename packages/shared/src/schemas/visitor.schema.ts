import { z } from "zod";

// ─── Visitor Pre-registration Schema ───

export const preregisterSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    company: z.string().optional().or(z.literal("")),
    hostUserId: z.string().uuid("Host user ID must be a valid UUID"),
    purpose: z.string().optional().or(z.literal("")),
    validFrom: z.coerce.date({ message: "Valid from must be a valid date" }),
    validUntil: z.coerce.date({ message: "Valid until must be a valid date" }),
    zoneIds: z.array(z.string().uuid()).optional(),
  })
  .refine((data) => data.validUntil > data.validFrom, {
    message: "Valid until must be after valid from",
    path: ["validUntil"],
  });

export type PreregisterInput = z.infer<typeof preregisterSchema>;

// ─── Check-in/Check-out Schemas ───

export const checkInSchema = z.object({
  visitId: z.string().uuid("Visit ID must be a valid UUID"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export const checkOutSchema = z.object({
  visitId: z.string().uuid("Visit ID must be a valid UUID"),
});

export type CheckOutInput = z.infer<typeof checkOutSchema>;

// ─── Visitor Query Schema ───

export const visitorQuerySchema = z.object({
  status: z.string().optional(),
  hostUserId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type VisitorQueryInput = z.infer<typeof visitorQuerySchema>;
