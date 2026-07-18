import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: string;
  entity: string;
}

// ─── HAPDP Compliance Audit Action Constants (Phase 4, BAS-30 to BAS-35) ───

export const AUDIT_ACTIONS = {
  // Subject access portal (BAS-34)
  SUBJECT_ACCESS_OTP_REQUESTED: 'SUBJECT_ACCESS_OTP_REQUESTED',
  SUBJECT_ACCESS_DATA_VIEWED: 'SUBJECT_ACCESS_DATA_VIEWED',
  SUBJECT_ACCESS_REQUEST_SUBMITTED: 'SUBJECT_ACCESS_REQUEST_SUBMITTED',

  // Pseudonymization access (BAS-33)
  SNAPSHOT_VIEWED: 'SNAPSHOT_VIEWED',
  SNAPSHOT_VIEWED_PSEUDONYMIZED: 'SNAPSHOT_VIEWED_PSEUDONYMIZED',

  // HAPDP declarations and consent (BAS-30, BAS-32)
  HAPDP_DECLARATION_GENERATED: 'HAPDP_DECLARATION_GENERATED',
  CONSENT_SIGNAGE_GENERATED: 'CONSENT_SIGNAGE_GENERATED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Decorator that marks an endpoint for automatic audit logging.
 * Usage:
 *   @AuditLog('CREATE', 'camera')
 *   @Post()
 *   async create(@Body() body: any) { ... }
 *
 *   @AuditLog('UPDATE', 'user')
 *   @Patch(':id')
 *   async update(@Param('id') id: string, @Body() body: any) { ... }
 */
export const AuditLog = (action: string, entity: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, entity });
