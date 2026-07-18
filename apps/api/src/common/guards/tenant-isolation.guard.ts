import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../modules/prisma/prisma.service";

/**
 * Guard that rejects requests without an organization context (orgId).
 *
 * Runs AFTER JwtAuthGuard (request.user is set by passport) and BEFORE
 * RolesGuard. If the route is marked @Public(), the guard is skipped
 * because public routes (register, login) legitimately have no orgId.
 *
 * Extended for BASTION multi-site (D-03):
 * - GLOBAL_ADMIN: can access own parent org or declared child orgs
 * - SITE_ADMIN: restricted to own org only
 * - SUPER_ADMIN/ADMIN: unchanged single-site behavior
 *
 * Registered as a global APP_GUARD in AppModule.
 */
@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // D-03: GLOBAL_ADMIN can access child orgs
    if (user.role === "GLOBAL_ADMIN" && request.params?.orgId) {
      const targetOrg = await this.prisma.organization.findUnique({
        where: { id: request.params.orgId },
        select: { parentOrganizationId: true, id: true },
      });
      if (!targetOrg) {
        throw new ForbiddenException("Organization not found");
      }
      // Allow if accessing own org or a child org
      if (targetOrg.id === user.orgId) {
        return true;
      }
      if (targetOrg.parentOrganizationId === user.orgId) {
        return true;
      }
      throw new ForbiddenException("Access to this organization is not permitted");
    }

    // D-03: SITE_ADMIN restricted to their own org
    if (user.role === "SITE_ADMIN" && request.params?.orgId) {
      if (request.params.orgId !== user.orgId) {
        throw new ForbiddenException("Site admin can only access their own site");
      }
    }

    return true;
  }
}
