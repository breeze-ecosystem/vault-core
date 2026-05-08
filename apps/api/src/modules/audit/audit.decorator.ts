import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: string;
  entity: string;
}

/**
 * Decorator that marks an endpoint for automatic audit logging.
 * The AuditLogInterceptor will pick up this metadata and create
 * an audit log entry after a successful response.
 *
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
