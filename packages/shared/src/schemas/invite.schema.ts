import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
