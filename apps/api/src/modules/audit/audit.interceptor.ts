import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Observable, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { AUDIT_KEY, AuditMeta } from "../../common/decorators/audited.decorator";

export interface AuditJobData {
  entity: string;
  entityId: string;
  action: string;
  userId?: string;
  orgId?: string | null;
  changes: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  content: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectQueue("audit-write") private auditQueue: Queue,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Check for @Audited() decorator metadata on the handler
    const auditMeta: AuditMeta | undefined = this.reflector.get<AuditMeta>(
      AUDIT_KEY,
      handler,
    );
    if (!auditMeta) return next.handle(); // Skip non-auditable endpoints

    return next.handle().pipe(
      tap((result) => {
        const entityId =
          result?.id || request.params?.id || "unknown";
        const userId = request.user?.id || "system";
        const orgId =
          request.user?.orgId || request.body?.orgId || null;
        const ipAddress =
          request.ip || request.socket?.remoteAddress || undefined;
        const userAgent = request.headers?.["user-agent"] || undefined;
        const timestamp = new Date().toISOString();

        let changes: Record<string, unknown> | null = null;
        if (auditMeta.action === "UPDATE" && auditMeta.captureChanges) {
          const beforeState = (request as any).__auditBeforeState;
          changes = {
            before: beforeState || null,
            after: this.sanitizeForAudit(result),
          };
        } else if (auditMeta.action === "CREATE") {
          changes = { after: this.sanitizeForAudit(result) };
        } else if (auditMeta.action === "DELETE") {
          changes = { before: this.sanitizeForAudit(request.params) };
        }

        // Build canonical content string for hash input (D-17)
        const content = [
          auditMeta.entity,
          entityId,
          auditMeta.action,
          userId,
          orgId || "",
          JSON.stringify(changes || {}),
          ipAddress || "",
          timestamp,
        ].join("|");

        // D-13: Audit writes are async — never block the response
        this.auditQueue.add(
          "write-audit",
          {
            entity: auditMeta.entity,
            entityId,
            action: auditMeta.action,
            userId,
            orgId,
            changes,
            ipAddress,
            userAgent,
            timestamp,
            content,
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: true,
          },
        );
      }),
      catchError((error) => {
        // Log failed mutation attempts too (for security monitoring)
        const entityId = request.params?.id || "unknown";
        const userId = request.user?.id || "system";
        const ipAddress =
          request.ip || request.socket?.remoteAddress || undefined;
        const timestamp = new Date().toISOString();
        const content = [
          auditMeta.entity,
          entityId,
          `${auditMeta.action}_FAILED`,
          userId,
          request.user?.orgId || "",
          JSON.stringify({ error: error.message }),
          ipAddress || "",
          timestamp,
        ].join("|");

        this.auditQueue.add("write-audit", {
          entity: auditMeta.entity,
          entityId,
          action: `${auditMeta.action}_FAILED`,
          userId,
          orgId: request.user?.orgId || null,
          changes: { error: error.message } as Record<string, unknown>,
          ipAddress,
          timestamp,
          content,
        });
        return throwError(() => error);
      }),
    );
  }

  private sanitizeForAudit(data: any): any {
    if (!data) return data;
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.pinHash;
    delete sanitized.refreshToken;
    delete sanitized.token;
    return sanitized;
  }
}
