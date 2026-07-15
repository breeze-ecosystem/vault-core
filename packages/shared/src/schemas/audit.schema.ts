import { z } from "zod";

/**
 * Query schema for GET /api/audit/logs.
 */
export const auditQuerySchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

/**
 * Schema for the /audit/verify query params.
 */
export const auditVerifySchema = z.object({
  entity: z.string().min(1),
  entityId: z.string().uuid(),
});

export type AuditVerifyInput = z.infer<typeof auditVerifySchema>;

/**
 * Schema for the /audit/verify-chain query params.
 */
export const auditVerifyOrgChainSchema = z.object({
  organizationId: z.string().uuid(),
});

export type AuditVerifyOrgChainInput = z.infer<typeof auditVerifyOrgChainSchema>;

/**
 * Schema for the /audit/export query params.
 */
export const auditExportSchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

export type AuditExportInput = z.infer<typeof auditExportSchema>;
