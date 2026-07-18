import { z } from "zod";

export const activateLicenseSchema = z.object({
  licenseJwt: z.string().min(1, "La clé de licence est requise"),
});

export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;
