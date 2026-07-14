import { z } from "zod";

export const createIncidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  siteId: z.string().uuid("Site ID must be a valid UUID"),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

export const updateIncidentStatusSchema = z.object({
  status: z.enum(["open", "triage", "investigating", "resolved", "closed"]),
  reason: z.string().optional(),
});

export const assignIncidentSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
  note: z.string().optional(),
});

export const addCommentSchema = z.object({
  text: z.string().min(1, "Comment text is required"),
});

export const queryIncidentSchema = z.object({
  status: z.string().optional(),
  severity: z.string().optional(),
  assignedTo: z.string().optional(),
  siteId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const addEvidenceSchema = z.object({
  type: z.enum(["video_clip", "snapshot", "access_event", "document", "note"]),
  url: z.string().optional(),
  eventType: z.string().optional(),
  eventId: z.string().optional(),
  description: z.string().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof updateIncidentStatusSchema>;
export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type QueryIncidentInput = z.infer<typeof queryIncidentSchema>;
export type AddEvidenceInput = z.infer<typeof addEvidenceSchema>;
