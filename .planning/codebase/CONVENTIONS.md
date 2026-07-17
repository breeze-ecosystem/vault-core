# Coding Conventions

> Generated: 2026-07-17

## Naming Patterns

| Category | Convention | Example |
|----------|------------|---------|
| Files (API) | `kebab-case` with NestJS suffixes | `auth.service.ts`, `auth.controller.ts`, `camera.module.ts`, `zod-validation.pipe.ts` |
| Files (Dashboard) | `kebab-case` | `stats-card.tsx`, `page-header.tsx`, `auth-context.tsx` |
| Files (Mobile) | `kebab-case` | `alert-card.tsx`, `error-boundary.tsx`, `auth-storage.ts` |
| Files (Shared) | `kebab-case` | `auth.schema.ts`, `camera-status.ts`, `audit.types.ts` |
| Functions/Methods | `camelCase` | `findAll()`, `findById()`, `createTokens()`, `handleLogin()` |
| Async functions | `async function` or `async ()` | `async function fetchCameras()`, `async findAll()` |
| React components | Named function declarations (Dashboard) | `export function StatsCard(...)` |
| React components | Named function exports (Mobile) | `export default function LoginScreen()` |
| React hooks | `camelCase` with `use` prefix | `useAuth()`, `useSidebar()`, `useI18n()` |
| Variables | `camelCase` | `mockUser`, `refreshToken`, `isAuthenticated` |
| Interfaces | `PascalCase` | `StatsCardProps`, `DashboardUser`, `PaginatedResponse<T>` |
| Types (unions/primitives) | `type` keyword preferred over `interface` | `type Role = "ADMIN" | "OPERATOR"` |
| Constants (objects) | `UPPER_SNAKE_CASE` | `ROLES`, `ROLE_HIERARCHY`, `ALERT_SEVERITY`, `CAMERA_STATUS` |
| Constants (string literals) | `UPPER_SNAKE_CASE` | `"CRITICAL"`, `"OPEN"`, `"ACKNOWLEDGED"` |
| Decorator metadata keys | `UPPER_SNAKE_CASE` | `IS_PUBLIC_KEY`, `ROLES_KEY`, `AUDIT_LOG_KEY` |
| Test files | `*.spec.ts` (suffix) | `auth.service.spec.ts`, `user.service.spec.ts` |
| Barrel exports | Named exports | `export { ROLES, ROLE_HIERARCHY } from "./constants/roles"` |
| Dashboard pages | `page.tsx` | `app/(dashboard)/page.tsx` |
| Dashboard layouts | `layout.tsx` | `app/layout.tsx`, `app/(dashboard)/layout.tsx` |
| Expo Router screens | File-based routing with `_layout.tsx` | `app/_layout.tsx`, `app/(tabs)/_layout.tsx` |

## Code Style

- **Formatter:** Prettier `^3.7.4` — uses Prettier defaults (2-space indent, double quotes, trailing commas, semicolons). No `.prettierrc` file. Format command: `prettier --write "**/*.{ts,tsx,md}"`
- **Linter:** ESLint v9 (flat config) with shared config at `packages/eslint-config/`:
  - `base.js` — JS recommended + `typescript-eslint` recommended + `eslint-config-prettier` + `eslint-plugin-turbo` + `eslint-plugin-only-warn`
  - `next.js` — Extends base + React + React Hooks + `@next/eslint-plugin-next`
  - `react-internal.js` — Extends base + React + React Hooks
  - Mobile uses `@repo/eslint-config/base` with local overrides: `@typescript-eslint/no-unused-vars: "warn"`, `@typescript-eslint/no-explicit-any: "warn"`
  - Dashboard uses `@repo/eslint-config/next-js`
  - UI package uses `@repo/eslint-config/react-internal`
  - All packages use flat config files named `eslint.config.mjs`
- **Key Rules:**
  - `turbo/no-undeclared-env-vars: "warn"` (in base config)
  - `react/react-in-jsx-scope: "off"` (Next.js + React 19 JSX transform)
  - React Hooks recommended rules enabled
  - Rules downgraded to `warn` by `eslint-plugin-only-warn`
  - `eslint-config-prettier` disables all formatting rules that conflict with Prettier
- **Quote style inconsistency:** API files (`apps/api/src/`) use single quotes (`'`), while Dashboard (`apps/dashboard/`), Mobile (`apps/mobile/`), and Shared (`packages/shared/`) use double quotes (`"`). The Prettier config defaults to double quotes.

## Import Organization

**Order:**
1. External packages (NestJS, React, Next.js, third-party)
2. Internal project imports using path aliases
3. Relative imports from same module

**Path Aliases:**
- `@/*` maps to `src/*` in API (`apps/api/tsconfig.json`), `apps/dashboard/` (via `tsconfig.json` paths), and `apps/mobile/` (via `tsconfig.json` paths)
- Workspace packages: `@repo/shared`, `@repo/eslint-config`, `@repo/design`, `@repo/ui`

**Pattern:**
```typescript
// API - external first
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Dashboard - external first, then internal
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchDashboardStats } from "@/lib/api";
import { cn } from "@/lib/utils";

// Shared - barrel index with section headers
// Schemas
export { registerSchema } from "./schemas/auth.schema";
export type { RegisterInput } from "./schemas/auth.schema";
```

**Type imports** use `import type { ... }` syntax in Dashboard and Mobile (e.g., `import type { LucideIcon } from "lucide-react"`, `import type { Metadata } from "next"`).

## Error Handling

**API (NestJS):**
- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`
- Single-line guard clause pattern:
  ```typescript
  if (!user) {
    throw new NotFoundException('User not found');
  }
  ```
- Global exception filter (`apps/api/src/common/filters/all-exceptions.filter.ts`) catches all unhandled exceptions and returns standardized `StandardErrorResponse`:
  ```typescript
  interface StandardErrorResponse {
    statusCode: number;
    error: string;
    message: string | string[];
    path: string;
    timestamp: string;
    details?: Record<string, unknown>;
  }
  ```
- Validation errors via `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`) throw `BadRequestException` with field-level error details.
- JWT guard throws `UnauthorizedException`; Roles guard throws `ForbiddenException`.
- NestJS `Logger` used for unexpected errors with stack traces.

**Dashboard:**
- API functions check `res.ok` and throw generic `Error` with French messages:
  ```typescript
  if (!res.ok) throw new Error(result.message || "Registration failed");
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  ```
- `fetchWithAuth` (`apps/dashboard/lib/auth-client.ts`) handles 401 auto-redirect to `/login`.
- Components use explicit `error: string | null` state with conditional error UI rendering.
- Toast notifications for user-facing errors.

**Mobile:**
- API similar pattern with try/catch and French error messages.
- `ErrorBoundary` class component (`apps/mobile/components/error-boundary.tsx`) wraps the app root.
- `console.warn("[ErrorBoundary]", ...)` for client-side error logging.

## Function Design

**Size:**
- Most service methods are under 45 lines
- Controllers are thin (10-20 lines per method)
- Dashboard page components can be 100-350 lines due to inline JSX

**Parameters:**
- Object parameters with inline type annotations preferred for 3+ params:
  ```typescript
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  })
  ```
- Simple 1-2 param methods use positional:
  ```typescript
  async findById(id: string)
  async login(email: string, password: string)
  ```

**Return Values:**
- Services return plain objects or Prisma query results directly
- Paginated endpoints return `{ data, total, page, limit }` shape
- Auth endpoints return `{ accessToken, refreshToken, user }` shape
- Error responses return `StandardErrorResponse` from global filter

**Async:** All I/O operations use `async/await`. `Promise.all` used for parallel operations:
```typescript
const [cameras, count] = await Promise.all([
  this.prisma.camera.findMany({ ... }),
  this.prisma.camera.count({ ... }),
]);
```

## Module Design

**Exports:**
- Named exports preferred (`export function`, `export class`, `export const`)
- Default exports used only for Next.js page components (`export default function OverviewPage()`) and Expo Router screens (`export default function RootLayout()`)

**Barrel Files:**
- `packages/shared/src/index.ts` re-exports from sub-modules with clear section headers and comments for stubs
- `apps/dashboard/components/ui/index.ts` re-exports all shadcn/ui components

**NestJS Module Pattern:**
```typescript
@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

**Global Module Pattern:**
```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**shadcn/ui Component Pattern:**
- `React.forwardRef` with `cva` (class-variance-authority) variant definitions:
  ```typescript
  const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
      const Comp = asChild ? Slot : "button";
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
      );
    }
  );
  Button.displayName = "Button";
  ```

**Mobile Component Pattern:**
- Function declarations with `StyleSheet.create` at bottom:
  ```typescript
  export function StatsCard({ title, value, subtitle, color }: StatsCardProps) {
    return (
      <View style={styles.card}>
        ...
      </View>
    );
  }
  const styles = StyleSheet.create({ ... });
  ```

**API Client Pattern:**
- Centralized functions in `apps/dashboard/lib/api.ts` and `apps/mobile/lib/api.ts`
- All use `fetchWithAuth()` which handles 401 with automatic token refresh
- Typed interfaces for all API responses

**Zod Validation + Swagger DTO Dual Pattern:**
- Shared Zod schemas in `packages/shared/src/schemas/` for runtime validation
- Class-validator DTOs in `apps/api/src/common/dto/` for Swagger/OpenAPI generation
- Controllers use `@Body(new ZodValidationPipe(schema))` for runtime validation + `@ApiBody({ type: DtoClass })` for Swagger

## Comments & Documentation

**When to Comment:**
- Horizontal rule comment sections used as separator markers in tests and some source files:
  ```typescript
  // ── Mocks ──────────────────────────────────────────────────────────────────────
  // ── Test Data ──────────────────────────────────────────────────────────────────
  // ── Tests ──────────────────────────────────────────────────────────────────────
  // ── register ────────────────────────────────────────────────────────────
  ```
- JSDoc on decorators, utility functions, and non-obvious logic:
  ```typescript
  /**
   * Exchange an SSO-authenticated user for JWT tokens.
   * Called by SsoController after Passport validates the SAML/OIDC assertion.
   */
  ```
- Brief inline comments for rationale:
  ```typescript
  // Rotate: revoke old, issue new
  // Single transaction: Org + User + Member (D-08)
  // Soft delete — deactivate the user
  ```
- Phase-related stubs in shared package commented out with notes:
  ```typescript
  // Schemas - Organization Config (Phase 8 stubs)
  // export { anprThresholdSchema } from "./schemas/organization.schema";
  ```
- `"use client"` directive at top of Dashboard interactive components

**JSDoc/TSDoc:**
- Used sparingly — mainly on decorator factory functions, shared exports, and complex utilities
- ESLint config files include `@type` JSDoc annotations

---

*Convention analysis: 2026-07-17*
