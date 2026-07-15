import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Guard that rejects requests without an organization context (orgId).
 *
 * Runs AFTER JwtAuthGuard (request.user is set by passport) and BEFORE
 * RolesGuard. If the route is marked @Public(), the guard is skipped
 * because public routes (register, login) legitimately have no orgId.
 *
 * Registered as a global APP_GUARD in AppModule.
 */
@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip @Public() routes — they have no JWT and thus no orgId
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.orgId) {
      throw new ForbiddenException("No organization context");
    }
    return true;
  }
}
