import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  organizationName: z.string().min(1, "Le nom de l'organisation est requis"),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().uuid("Refresh token invalide"),
});

export const switchOrgSchema = z.object({
  organizationId: z.string().uuid("ID d'organisation invalide"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type SwitchOrgInput = z.infer<typeof switchOrgSchema>;
