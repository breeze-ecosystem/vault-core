import { Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AsyncLocalStorage store for the current organization ID.
 * Populated by TenantContextMiddleware and withTenantContext() worker helper.
 * Read by the Prisma extension to auto-scope queries to the current tenant.
 */
export const orgContext = new AsyncLocalStorage<string>();

/**
 * Models that have an `organizationId` field and should be scoped to the
 * current tenant. These are all domain models except Organization itself
 * (the tenant root) and User (scoped via OrganizationMember join table).
 */
const SCOPED_MODELS = new Set([
  "Camera",
  "Door",
  "Zone",
  "Incident",
  "VehicleList",
  "AuditLog",
  "OrganizationMember",
  "Invite",
  "FeatureFlag",
  "Credential",
  "Alert",
  "CameraPrompt",
]);

/**
 * Operations that query existing data — these need WHERE organizationId injected.
 */
const READ_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

/**
 * Operations that create data — these need organizationId auto-set.
 */
const WRITE_OPS = new Set(["create", "createMany", "upsert"]);

/**
 * Prisma Client Extension that auto-injects `organizationId` into all queries
 * on scoped models. Uses AsyncLocalStorage to read the current orgId from the
 * request context (set by TenantContextMiddleware).
 *
 * - READ operations: injects `WHERE organizationId = $orgId`
 * - CREATE operations: auto-sets `data.organizationId`
 * - UPSERT: sets on both `create` and `where`
 * - UPDATE/DELETE (single record): injects `WHERE organizationId = $orgId` in where clause
 *
 * If orgId is not set (e.g., unauthenticated routes), the extension is a no-op.
 */
export const tenantExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const orgId = orgContext.getStore();

          // No-op if no org context or model is not scoped
          if (!orgId || !model || !SCOPED_MODELS.has(model)) {
            return query(args);
          }

          // Read/delete operations: add WHERE organizationId
          if (READ_OPS.has(operation)) {
            (args as any).where = {
              ...((args as any).where ?? {}),
              organizationId: orgId,
            };
          }

          // Create operations: auto-set organizationId on data
          if (operation === "create") {
            (args as any).data = {
              ...((args as any).data ?? {}),
              organizationId: orgId,
            };
          }

          // createMany: auto-set on each item in data array
          if (operation === "createMany") {
            const data = (args as any).data;
            if (Array.isArray(data)) {
              (args as any).data = data.map((item: any) => ({
                ...item,
                organizationId: orgId,
              }));
            } else {
              (args as any).data = {
                ...(data ?? {}),
                organizationId: orgId,
              };
            }
          }

          // Upsert: set on both create payload and where clause
          if (operation === "upsert") {
            (args as any).create = {
              ...((args as any).create ?? {}),
              organizationId: orgId,
            };
            (args as any).where = {
              ...((args as any).where ?? {}),
              organizationId: orgId,
            };
          }

          // Single update/delete: inject organizationId into where
          if (operation === "update" || operation === "delete") {
            (args as any).where = {
              ...((args as any).where ?? {}),
              organizationId: orgId,
            };
          }

          return query(args);
        },
      },
    },
  })
);
