import { z } from "zod";

export const createTenantApiKeySchema = z.object({
  name: z.string().min(1, "Le nom de la clé est requis").max(100, "Le nom est trop long"),
  scopes: z
    .array(z.string())
    .optional()
    .default([
      "read:cameras",
      "read:doors",
      "read:alerts",
      "read:incidents",
      "read:events",
      "read:audit",
    ]),
  rateLimit: z
    .number()
    .int()
    .min(1, "La limite doit être d'au moins 1 requête/min")
    .max(10000, "La limite ne peut pas dépasser 10 000 requêtes/min")
    .optional()
    .default(300),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export type CreateTenantApiKeyInput = z.infer<typeof createTenantApiKeySchema>;
