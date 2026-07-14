# Coding Conventions

**Analysis Date:** 2026-07-14

## Naming Patterns

**Files:**
- kebab-case for most files: `stats-card.tsx`, `auth.service.ts`, `zod-validation.pipe.ts`
- NestJS modules follow specific suffixes: `*.service.ts`, `*.controller.ts`, `*.module.ts`, `*.spec.ts`, `*.gateway.ts`, `*.decorator.ts`, `*.processor.ts`
- Dashboard layouts: `layout.tsx`, page routes: `page.tsx`
- Expo Router uses file-based routing with `_layout.tsx`, `index.tsx`, `[id].tsx`

**Functions:**
- camelCase: `findAll`, `findById`, `createTokens`, `fetchDashboardStats`, `hasMinRole`
- Async functions: `async function fetchCameras()` or `async findAll()`
- React hooks: `useAuth()`, `useSidebar()` — always prefixed with `use`
- React components: `function StatsCard()` or arrow function `const Button = React.forwardRef(...)`

**Variables:**
- camelCase: `mockUser`, `refreshToken`, `isAuthenticated`, `onlineCount`
- Destructuring used extensively in function parameters:
  ```typescript
  async findAll(filters?: { severity?: string; status?: string; page?: number; limit?: number })
  ```

**Types/Interfaces:**
- PascalCase: `StatsCardProps`, `DashboardUser`, `PaginatedResponse<T>`, `CameraPrompt`, `AuthResult`, `StandardErrorResponse`
- Prefer `interface` over `type` for object shapes; use `type` for unions, primitives, and utility types
- Type imports use `import type { ... }` syntax in dashboard/mobile (e.g., `import type { LucideIcon } from "lucide-react"`)

**Constants:**
- UPPER_SNAKE_CASE for object constants: `ROLES`, `ROLE_HIERARCHY`, `ALERT_SEVERITY`, `CAMERA_STATUS`
- NestJS metadata keys: `IS_PUBLIC_KEY`, `ROLES_KEY`, `AUDIT_LOG_KEY`

**Enums/property values:**
- UPPER_SNAKE_CASE string literals: `"CRITICAL"`, `"HIGH"`, `"OPEN"`, `"ACKNOWLEDGED"`

## Code Style

**Formatting:**
- **Tool:** Prettier `^3.7.4` (configured at root `package.json` in `@repo/eslint-config`)
- **No `.prettierrc` file** — uses Prettier defaults (2-space indent, double quotes, trailing commas, semicolons)
- Format command: `prettier --write "**/*.{ts,tsx,md}"`

**Linting:**
- **Tool:** ESLint v9 (flat config) with `typescript-eslint` v8
- **Shared config:** `@repo/eslint-config` in `packages/eslint-config/`
  - `base.js` — TypeScript recommended + Turbo + Prettier compatibility
  - `next.js` — extends base with Next.js + React + react-hooks plugins
  - `react-internal.js` — extends base with React + react-hooks plugins (no Next.js)
- **Key rules:**
  - `turbo/no-undeclared-env-vars`: warn
  - `react/react-in-jsx-scope`: off (new JSX transform)
  - `@typescript-eslint/no-unused-vars`: warn (in mobile)
  - `@typescript-eslint/no-explicit-any`: warn (in mobile)
  - All errors downgraded to warnings via `eslint-plugin-only-warn`

**Quotes:**
- Most files use double quotes (`"`): `packages/shared/src/`, `apps/dashboard/`, `apps/mobile/`
- Some API files use single quotes (`'`): `apps/api/src/modules/user/user.service.ts`, `apps/api/src/common/filters/all-exceptions.filter.ts`
- **Inconsistency between apps** — the shared config and Prettier default to double quotes

**Semicolons:**
- Used consistently at end of statements in all TypeScript files

**React Component Style:**
- Dashboard (Next.js): named function declarations with explicit props interfaces
  ```typescript
  interface StatsCardProps { ... }
  export function StatsCard({ title, value, ... }: StatsCardProps) { ... }
  ```
- Dashboard UI primitives (shadcn/ui pattern): `React.forwardRef` with `cva` variants
  ```typescript
  const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => { ... }
  );
  Button.displayName = "Button";
  ```
- Mobile (React Native): function declarations with `StyleSheet.create`
  ```typescript
  export function StatsCard({ title, value, subtitle, color }: StatsCardProps) { ... }
  const styles = StyleSheet.create({ ... });
  ```

## Import Organization

**Order:**
1. Framework/external packages (`react`, `@nestjs/common`, `next/link`)
2. Workspace packages (`@repo/shared`, `@repo/eslint-config`)
3. Path aliases (`@/lib/utils`, `@/components/ui/card`)
4. Relative imports (`../prisma/prisma.service`, `../../common/guards/jwt-auth.guard`)

**Typical pattern (NestJS controller):**
```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CameraService } from './camera.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCameraSchema } from '@repo/shared';
```

**Typical pattern (Next.js page):**
```typescript
"use client";
import { useEffect, useState } from "react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent } from "@/components/ui/card";
import { fetchDashboardStats, type DashboardStats } from "@/lib/api";
```

**Path Aliases:**
- All apps and packages use `@/*` mapping to their own root:
  - `apps/api`: `@/*` → `src/*` (`apps/api/tsconfig.json`)
  - `apps/dashboard`: `@/*` → `./*` (`apps/dashboard/tsconfig.json`)
  - `apps/mobile`: `@/*` → `./*` (`apps/mobile/tsconfig.json`)
- Workspace packages referenced as `@repo/shared`, `@repo/eslint-config`, etc.

## Error Handling

**Backend (NestJS):**
- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `ConflictException`, `UnauthorizedException`
- Single-line guard clause pattern in services:
  ```typescript
  if (!user) throw new NotFoundException('User not found');
  ```
- Global exception filter (`AllExceptionsFilter` in `apps/api/src/common/filters/all-exceptions.filter.ts`) wraps all uncaught errors in `StandardErrorResponse`
- Validation errors via `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`):
  ```typescript
  throw new BadRequestException({ message: "Validation failed", errors });
  ```
- Authentication failures: throw `UnauthorizedException` with descriptive messages

**Frontend (Dashboard):**
- API client functions (`apps/dashboard/lib/api.ts`) check `res.ok` and throw `Error` with messages
- Components use explicit `error: string | null` state with error UI rendering:
  ```typescript
  const [error, setError] = useState<string | null>(null);
  // ...
  if (error) return <ErrorDisplay message={error} />;
  ```
- `fetchWithAuth` in `apps/dashboard/lib/auth-client.ts` handles 401 auto-redirect to `/login`

**Frontend (Mobile):**
- Try/catch in auth init with graceful fallback: `console.warn("[auth] init error")`
- `ErrorBoundary` component wraps the app root (`apps/mobile/components/error-boundary.tsx`)

## Logging

**Backend:**
- NestJS `Logger` injected via constructor pattern:
  ```typescript
  private readonly logger = new Logger(ClassName.name);
  ```
- Methods: `this.logger.log(...)`, `this.logger.error(...)`, `this.logger.warn(...)`, `this.logger.debug(...)`
- Log messages are in English: `"Database connected"`, `"Database connection failed: ..."`
- Stack traces included for unexpected errors only

**Frontend:**
- `console.error` only for environment variable checks in `lib/api.ts` and `lib/auth-client.ts`
- No logging framework in dashboard or mobile apps

## Comments

**Section Dividers:**
- Horizontal rule comment style used in API test files and some source files:
  ```typescript
  // ── Section Name ──────────────────────────────────────────────────────────────
  // ── Mocks ──
  // ── Test Data ──
  // ── Tests ──
  ```
  Also present in source files like `camera.controller.ts`: `// ── Camera Prompts ──`

**JSDoc/TSDoc:**
- Used on decorators and utility functions:
  ```typescript
  /**
   * Decorator that marks an endpoint for automatic audit logging.
   * Usage: @AuditLog('CREATE', 'camera')
   */
  ```
- Used on shared constants:
  ```typescript
  /**
   * Hierarchy: key can access everything that values can access.
   * SUPER_ADMIN > ADMIN > SUPERVISOR > OPERATOR > VIEWER
   */
  ```

**In-Code Comments:**
- Brief explanatory comments for non-obvious logic:
  ```typescript
  // Soft delete — deactivate the user
  // Rotate: revoke old, issue new
  // Revoke ALL tokens for this user — possible token theft
  ```

## Function Design

**Size:**
- Most service methods are under 45 lines
- Controllers are thin (10-20 lines per method)
- Dashboard page components can be longer (100-250 lines) due to inline JSX

**Parameters:**
- Object parameters with inline type annotations preferred over positional args for 3+ params:
  ```typescript
  async findAll(filters?: { severity?: string; status?: string; page?: number; limit?: number })
  ```

**Return Values:**
- Services return plain objects or Prisma query results directly
- Paginated endpoints return `{ data, total, page, limit }` shape
- Auth endpoints return `{ accessToken, refreshToken, user }` shape
- Error endpoints return `StandardErrorResponse` from global filter

**Async:**
- All I/O operations use `async/await`
- `Promise.all` used for parallel independent operations:
  ```typescript
  const [data, total] = await Promise.all([
    this.prisma.alert.findMany(...),
    this.prisma.alert.count(...),
  ]);
  ```

## Module Design

**Exports:**
- Named exports preferred (`export function`, `export class`, `export const`)
- Default exports used only for Next.js page components (`export default function OverviewPage()`)
- Barrel file in `packages/shared/src/index.ts` re-exports from sub-modules with clear section headers

**NestJS Module Pattern:**
Each feature module contains at minimum:
```
modules/[entity]/
  ├── [entity].module.ts         # NestJS module declaration
  ├── [entity].service.ts        # Business logic
  ├── [entity].controller.ts     # HTTP endpoints
  └── [entity].service.spec.ts   # Unit tests (optional)
```

**React Component Organization:**
```
components/
  ├── [feature].tsx              # Feature-level components
  └── ui/                        # Base UI primitives (shadcn/ui pattern)
      ├── button.tsx
      ├── card.tsx
      └── badge.tsx
lib/
  ├── [utility].ts               # Shared utilities, API clients
  └── [feature]-context.tsx      # React context providers
app/
  └── [route]/page.tsx           # Next.js page routes
```

## Styling

**Dashboard (Tailwind CSS):**
- Utility-first with `cn()` helper in `apps/dashboard/lib/utils.ts` (clsx + tailwind-merge)
- Dark theme by default (`<html className="dark">`)
- Named semantic color tokens: `text-primary`, `bg-muted`, `border-input`
- Custom utilities: `status-pulse` animation for online camera indicator
- Component variants via `class-variance-authority` (cva):
  ```typescript
  const buttonVariants = cva("...", { variants: { variant: {...}, size: {...} } });
  ```

**Mobile (React Native StyleSheet):**
- Theme tokens in `apps/mobile/lib/theme.ts` (colors, typography, spacing, borderRadius)
- Styles defined at bottom of component files with `StyleSheet.create()`
- Spread operator for typography presets:
  ```typescript
  value: { ...typography.mono, fontSize: 28 }
  ```

## Zod vs class-validator

**Dual validation approach:**
- `packages/shared/` defines Zod schemas (`registerSchema`, `createCameraSchema`, etc.)
- `apps/api/src/common/dto/index.ts` defines class-validator DTOs for Swagger documentation
- Controllers use `ZodValidationPipe` for runtime validation (`apps/api/src/common/pipes/zod-validation.pipe.ts`)
- Swagger decorators use the class-validator DTO classes for OpenAPI generation

---

*Convention analysis: 2026-07-14*
