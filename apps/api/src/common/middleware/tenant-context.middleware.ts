import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { orgContext } from "../../modules/prisma/tenant-extension";

/**
 * Middleware that sets PostgreSQL session variable `app.current_organization_id`
 * from the authenticated user's orgId. This enables Row-Level Security (RLS)
 * on all organization-scoped tables (two-layer isolation per D-09).
 *
 * Also wraps the remaining request lifecycle in orgContext.run() so the Prisma
 * Client Extension (tenant-extension.ts) can read the current orgId via
 * AsyncLocalStorage for automatic query scoping.
 *
 * If the user has no orgId (unauthenticated or pre-org routes), neither the
 * session variable nor the async context is set — the extension is a no-op and
 * RLS returns no rows.
 *
 * This middleware runs AFTER JwtAuthGuard (reads req.user set by passport).
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;

    if (user?.orgId) {
      // Set PostgreSQL RLS session variable for defense-in-depth
      try {
        await this.prisma.$executeRawUnsafe(
          `SELECT set_config('app.current_organization_id', $1, TRUE)`,
          user.orgId,
        );
      } catch (err: any) {
        // PostgreSQL session variable setting is non-critical — log and continue
        this.logger.warn("Failed to set RLS context", err.message);
      }

      // Run rest of request within AsyncLocalStorage context for Prisma extension
      orgContext.run(user.orgId, () => next());
    } else {
      // No org context — query extension will be no-op, RLS will deny
      next();
    }
  }
}
