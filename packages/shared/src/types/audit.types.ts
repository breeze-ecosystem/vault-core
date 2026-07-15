/**
 * Audit entry as returned by the audit_log hypertable.
 */
export interface AuditEntry {
  time: string;
  entity: string;
  entityId: string;
  action: string;
  userId: string | null;
  organizationId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  previousHash: string | null;
  hash: string;
  content: string;
}

/**
 * Result from /audit/verify hash-chain validation.
 */
export interface ChainVerificationResult {
  verified: boolean;
  totalEntries: number;
  tamperedIndices: number[];
  genesisHash: string | null;
  latestHash: string | null;
}

/**
 * Parameters for filtered audit log export.
 */
export interface AuditExportParams {
  entity?: string;
  entityId?: string;
  userId?: string;
  organizationId?: string;
  action?: string;
  from?: string;
  to?: string;
  format: "json" | "csv";
}

/**
 * Summary statistics returned by /audit/stats.
 */
export interface AuditStats {
  totalEntries: number;
  byEntity: Record<string, number>;
  byAction: Record<string, number>;
  byHour: { hour: string; count: number }[];
}
