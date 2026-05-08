import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { AuditService } from './audit.service';
import { AUDIT_LOG_KEY, AuditLogMetadata } from './audit.decorator';

/**
 * Interceptor that automatically creates audit log entries for
 * decorated endpoints after a successful response.
 *
 * Can be applied globally or per-controller. It checks for the
 * @AuditLog() decorator metadata and logs accordingly.
 *
 * For CREATE actions: logs the created entity ID from the response.
 * For UPDATE actions: logs the entity ID from the param.
 * For DELETE actions: logs the entity ID from the param.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as any).user;

    return next.handle().pipe(
      tap((response) => {
        // Extract entity ID from route params or response
        let entityId: string | undefined;

        // Try to get from route params first
        const params = request.params as any;
        if (params?.id) {
          entityId = params.id;
        } else if (params?.cameraId) {
          entityId = params.cameraId;
        } else if (params?.siteId) {
          entityId = params.siteId;
        } else if (params?.userId) {
          entityId = params.userId;
        }

        // For CREATE actions, try to get ID from response
        if (!entityId && response?.id) {
          entityId = response.id;
        }

        this.auditService.log({
          userId: user?.id,
          action: auditMeta.action,
          entity: auditMeta.entity,
          entityId,
          request,
        });
      }),
    );
  }
}
