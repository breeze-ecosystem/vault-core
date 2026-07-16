import { z } from "zod";

export const revokeCredentialSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export type RevokeCredentialInput = z.infer<typeof revokeCredentialSchema>;

export const reissueCredentialSchema = z.object({
  newValidUntil: z.string().datetime(),
});

export type ReissueCredentialInput = z.infer<typeof reissueCredentialSchema>;
