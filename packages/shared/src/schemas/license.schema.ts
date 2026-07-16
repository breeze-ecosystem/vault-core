import { z } from "zod";

export const CURRENCY_OPTIONS = ["USD", "EUR", "XOF", "GBP", "JPY"] as const;

export const generateLicenseSchema = z.object({
  organizationId: z.string().uuid("ID d'organisation invalide"),
  maxCameras: z.number().int().min(0, "Le nombre de caméras doit être positif"),
  maxDoors: z.number().int().min(0, "Le nombre de portes doit être positif"),
  expiresAt: z.string().datetime("La date d'expiration est invalide"),
  gracePeriodDays: z
    .number()
    .int()
    .min(0, "La période de grâce doit être positive")
    .max(90, "La période de grâce ne peut pas dépasser 90 jours")
    .default(7),
  licenseVersion: z.number().int().default(1),
  currency: z.enum(CURRENCY_OPTIONS).default("USD"),
});

export const activateLicenseSchema = z.object({
  licenseJwt: z.string().min(1, "La clé de licence est requise"),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Le nom de la clé est requis"),
});

export type GenerateLicenseInput = z.infer<typeof generateLicenseSchema>;
export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
