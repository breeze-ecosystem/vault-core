import { z } from "zod";

export const createIdpConfigSchema = z.object({
  protocol: z.enum(["saml", "oidc"]),
  metadataUrl: z.string().url().optional(),
  entityId: z.string().optional(),
  certificate: z.string().optional(),
  attributeMappings: z.record(z.string()).optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  issuerUrl: z.string().url().optional(),
  ssoEnforced: z.boolean().optional(),
});

export const updateIdpConfigSchema = createIdpConfigSchema.partial();

export type CreateIdpConfigInput = z.infer<typeof createIdpConfigSchema>;
export type UpdateIdpConfigInput = z.infer<typeof updateIdpConfigSchema>;
