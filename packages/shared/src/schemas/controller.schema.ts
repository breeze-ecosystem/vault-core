import { z } from "zod";

export const enrollControllerSchema = z.object({
  name: z.string().min(1).max(128),
  siteId: z.string().uuid(),
  zoneId: z.string().uuid().optional(),
});

export type EnrollControllerInput = z.infer<typeof enrollControllerSchema>;
