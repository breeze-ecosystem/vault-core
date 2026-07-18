import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, from, switchMap } from "rxjs";
import { Reflector } from "@nestjs/core";
import { PseudonymizationService } from "./pseudonymization.service";
import { AuditService } from "../audit/audit.service";

// Roles that can view full-resolution snapshots (D-06: explicit role whitelist)
const PRIVILEGED_ROLES = new Set(["ADMIN", "SUPERVISOR", "SUPER_ADMIN", "GLOBAL_ADMIN"]);

/**
 * Interceptor that blurs snapshot images for non-privileged roles
 * when pseudonymization is enabled for the organization.
 *
 * Per BAS-33 / D-06: faces are blurred by default. Only ADMIN, SUPERVISOR,
 * SUPER_ADMIN, and GLOBAL_ADMIN roles can view full-resolution images.
 * Access to full-resolution images is logged via AuditService.
 */
@Injectable()
export class PseudonymizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PseudonymizationInterceptor.name);

  constructor(
    private readonly pseudonymizationService: PseudonymizationService,
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = user?.orgId;
    const role = user?.role;

    // Skip if no user or org context
    if (!user || !orgId || !role) {
      return next.handle();
    }

    // If user has privileged role, log and return full resolution
    if (PRIVILEGED_ROLES.has(role)) {
      // Log access to full-resolution snapshot per BAS-35
      void this.logFullResolutionAccess(request, user, orgId);
      return next.handle();
    }

    // Check if pseudonymization is enabled for this org
    return from(this.pseudonymizationService.isPseudonymizationEnabled(orgId)).pipe(
      switchMap((enabled) => {
        if (!enabled) return next.handle();

        // Pseudonymization active — apply blur to snapshot responses
        return this.wrapWithBlur(request, next);
      }),
    );
  }

  private wrapWithBlur(request: any, next: CallHandler): Observable<any> {
    // Handle snapshot URL responses — patch the response to serve blurred images
    return next.handle().pipe(
      switchMap(async (result) => {
        if (!result) return result;

        // Check if this is a snapshot response that needs blurring
        const snapshotUrl = result?.snapshotUrl || result?.lastSnapshotUrl;
        if (!snapshotUrl) return result;

        // Apply blur if the result contains a snapshot path
        try {
          // Extract filename from the URL/path
          const filename = snapshotUrl.split("/").pop();
          if (!filename) return result;

          // Determine snapshot directory from the result context
          const snapshotDir = this.getSnapshotDir(request);

          const blurred = await this.pseudonymizationService.blurSnapshot(filename, snapshotDir);

          // Convert blurred buffer to base64 and patch the response
          const blurredBase64 = blurred.toString("base64");
          const blurredUrl = `data:image/jpeg;base64,${blurredBase64}`;

          return {
            ...result,
            snapshotUrl: blurredUrl,
            pseudonymized: true,
          };
        } catch (err) {
          this.logger.error("Failed to apply pseudonymization blur", err as Error);
          return result;
        }
      }),
    );
  }

  private async logFullResolutionAccess(
    request: any,
    user: any,
    orgId: string,
  ): Promise<void> {
    try {
      const snapshotUrl = request.url || "";
      await this.auditService.log({
        userId: user.id,
        action: "VIEW_SNAPSHOT_FULL",
        entity: "snapshot",
        entityId: snapshotUrl,
        request,
      });
    } catch (err) {
      this.logger.warn("Failed to log full-resolution access", err as Error);
    }
  }

  private getSnapshotDir(request: any): string {
    // Default snapshot directory — can be customized via request context
    return process.env.SNAPSHOT_DIR || "/mnt/snapshots";
  }
}
