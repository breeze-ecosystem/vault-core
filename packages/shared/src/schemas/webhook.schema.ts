import { z } from "zod";

export const createWebhookSubscriptionSchema = z.object({
  eventType: z.string().min(1, "Le type d'événement est requis"),
  targetUrl: z
    .string()
    .url("L'URL doit être une URL valide")
    .refine((url) => url.startsWith("https://"), {
      message: "L'URL du webhook doit utiliser HTTPS",
    }),
});

export const updateWebhookSubscriptionSchema = z.object({
  targetUrl: z
    .string()
    .url("L'URL doit être une URL valide")
    .refine((url) => url.startsWith("https://"), {
      message: "L'URL du webhook doit utiliser HTTPS",
    })
    .optional(),
  isActive: z.boolean().optional(),
  rotateSecret: z.boolean().optional(),
});

export type CreateWebhookSubscriptionInput = z.infer<typeof createWebhookSubscriptionSchema>;
export type UpdateWebhookSubscriptionInput = z.infer<typeof updateWebhookSubscriptionSchema>;
