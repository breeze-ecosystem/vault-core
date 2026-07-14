import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../../modules/prisma/prisma.service";

/**
 * Middleware that sets PostgreSQL session variable `app.current_site_id`
 * from the authenticated user's siteId. This enables Row-Level Security (RLS)
 * on all site-scoped tables (AUDT-06).
 *
 * If the user has no siteId (super-admin), the session variable is not set,
 * and RLS policies return no rows — super-admins use an application-level bypass.
 */
@Injectable()
export class SiteContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SiteContextMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;
    if (user?.siteId) {
      try {
        await this.prisma.$executeRawUnsafe(
          `SELECT set_config('app.current_site_id', $1, TRUE)`,
          user.siteId,
        );
      } catch (err: any) {
        // PostgreSQL session variable setting is non-critical — log and continue
        this.logger.warn("Failed to set RLS context", err.message);
      }
    }
    // If user has no siteId (super-admin), don't set the context.
    // RLS policy returns no rows for NULL current_site_id, but super-admin uses
    // a separate mechanism (application-level bypass).
    next();
  }
}
