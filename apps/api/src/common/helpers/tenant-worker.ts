import { PrismaService } from "../../modules/prisma/prisma.service";
import { orgContext } from "../../modules/prisma/tenant-extension";

/**
 * Wraps a BullMQ worker callback with proper tenant isolation context.
 *
 * BullMQ processors run outside the HTTP request lifecycle, so the
 * TenantContextMiddleware does not execute. This helper sets both:
 *   1. The PostgreSQL RLS session variable (`app.current_organization_id`)
 *      so that raw SQL queries and RLS policies enforce tenant isolation.
 *   2. The AsyncLocalStorage `orgContext` so that the Prisma Client Extension
 *      auto-scopes model queries to the current organization.
 *
 * Usage:
 * ```typescript
 * async process(job: Job) {
 *   return withTenantContext(this.prisma, job.data.orgId, async () => {
 *     // All DB queries here are scoped to job.data.orgId
 *     const data = await this.prisma.camera.findMany();
 *     return data;
 *   });
 * }
 * ```
 *
 * Workers that forget to call this helper will have no RLS context set,
 * causing RLS to return zero rows — the job will fail visibly rather than
 * silently leaking data across tenants.
 */
export async function withTenantContext(
  prisma: PrismaService,
  orgId: string,
  fn: () => Promise<any>,
): Promise<any> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_organization_id', $1, TRUE)`,
    orgId,
  );
  return orgContext.run(orgId, fn);
}
