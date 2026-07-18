import { z } from "zod";

// ─── Phase 4: Retention Policy ───

export const retentionPolicySchema = z.object({
  siteId: z.string().uuid().optional(),
  eventType: z.string().min(1),
  tableType: z.enum(["timescaledb", "prisma"]),
  retentionDays: z.number().int().min(30).max(730),
  exportBeforePurge: z.boolean().optional(),
  exportFormat: z.enum(["CSV", "PDF"]).optional(),
});

export type RetentionPolicyInput = z.infer<typeof retentionPolicySchema>;

// ─── Phase 4: Forensic Evidence ───

export const forensicEvidenceSchema = z.object({
  eventId: z.string().uuid(),
  mediaType: z.enum(["zip", "clip"]),
  metadata: z.record(z.any()).optional(),
});

export type ForensicEvidenceInput = z.infer<typeof forensicEvidenceSchema>;

// ─── Phase 4: Backup Config ───

export const backupConfigSchema = z.object({
  targetPath: z.string().min(3, "Target path is required"),
  username: z.string().optional(),
  password: z.string().optional(),
  schedule: z.enum(["daily", "weekly"]),
});

export type BackupConfigInput = z.infer<typeof backupConfigSchema>;
