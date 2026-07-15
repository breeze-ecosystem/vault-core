import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("SN"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().default(true),
  billingEmail: z.string().email("Email invalide").optional(),
  planTier: z.enum(["FREE", "PROFESSIONAL", "ENTERPRISE"]).default("FREE"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().optional(),
  billingEmail: z.string().email("Email invalide").optional(),
  planTier: z.enum(["FREE", "PROFESSIONAL", "ENTERPRISE"]).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
