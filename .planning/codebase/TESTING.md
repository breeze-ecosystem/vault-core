# Testing Patterns

**Analysis Date:** 2026-07-14

## Test Framework

**Runner:**
- **Jest** `^29.7.0` with `ts-jest` `^29.2.5`
- Config: `apps/api/jest.config.js`

**Assertion Library:**
- Jest built-in (`expect`)

**NestJS Testing Utilities:**
- `@nestjs/testing` `^10.4.8` — provides `Test.createTestingModule` for module isolation

**Run Commands:**
```bash
pnpm --filter @repo/api test              # Run all API tests
pnpm --filter @repo/api test:watch        # Watch mode
pnpm --filter @repo/api test:cov          # Coverage report
```

## Test File Organization

**Location:**
- Co-located with source files: `apps/api/src/modules/[entity]/[entity].service.spec.ts`
- Only the `apps/api` package has tests

**Current test files (5 total):**
```
apps/api/src/modules/
  ├── auth/auth.service.spec.ts       (258 lines)
  ├── user/user.service.spec.ts       (255 lines)
  ├── alert/alert.service.spec.ts     (287 lines)
  ├── site/site.service.spec.ts       (208 lines)
  └── camera/camera.service.spec.ts   (324 lines)
```

**No tests exist for:**
- Controllers (`*.controller.ts`) — no HTTP-level tests
- Guards, pipes, filters, decorators
- Dashboard (`apps/dashboard/`) — no Next.js component tests
- Mobile (`apps/mobile/`) — no React Native tests
- Shared package (`packages/shared/`) — no schema/constant tests
- UI package (`packages/ui/`) — no component tests
- Gateway/WebSocket (`notification.gateway.ts`) — no integration tests
- BullMQ processors (`inference.processor.ts`, `notifications.processor.ts`)

## Test Structure

**Suite Organization:**
Each test file follows a strict 4-section structure with horizontal-rule comments:

```typescript
// ── Import-Laden ─────────────────────────────────────────────────────────
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AlertService } from './alert.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Mocks ────────────────────────────────────────────────────────────────
const mockPrismaService = {
  alert: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

// ── Test Data ────────────────────────────────────────────────────────────
const mockAlert = {
  id: 'alert-uuid-1',
  title: 'Intrusion détectée',
  severity: 'HIGH',
  status: 'OPEN',
  // ...
};

// ── Tests ────────────────────────────────────────────────────────────────
describe('AlertService', () => {
  let service: AlertService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<AlertService>(AlertService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Nested describe blocks for each method
  describe('findAll', () => {
    it('should return paginated alerts with total count', async () => {
      mockPrismaService.alert.findMany.mockResolvedValue([mockAlert]);
      mockPrismaService.alert.count.mockResolvedValue(1);
      const result = await service.findAll();
      expect(result).toEqual({ data: [mockAlert], total: 1, page: 1, limit: 20 });
    });
  });
});
```

**Key Patterns:**
- **Setup:** `beforeEach` with `jest.clearAllMocks()` before each test, `Test.createTestingModule` compiles a fresh module
- **Teardown:** No explicit teardown (NestJS testing module handles cleanup)
- **Assertions:** Primarily `expect().toEqual()`, `expect().toHaveProperty()`, `expect().rejects.toThrow()`, `expect().toHaveBeenCalledWith()`
- **Method isolation:** Each service method tested under its own nested `describe` block
- **Always includes:** `it('should be defined')` — basic DI smoke test

**Test naming convention:**
- Suite: `describe('ServiceName', ...)`
- Method suites: `describe('methodName', ...)`
- Cases: `it('should [expected behavior]', ...)` — descriptive, English/French mixed

## Mocking

**Framework:** Jest manual mocks — no `@nestjs/testing` auto-mocking

**Pattern — Mock objects provided via `useValue`:**
```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
};

// In beforeEach:
const module = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: PrismaService, useValue: mockPrismaService },
    { provide: JwtService, useValue: mockJwtService },
    { provide: ConfigService, useValue: mockConfigService },
  ],
}).compile();
```

**Pattern — Module-level `jest.mock()` for external libraries:**
```typescript
jest.mock('bcryptjs', () => ({
  __esModule: true,
  ...jest.requireActual('bcryptjs'),
  hash: jest.fn(),
  compare: jest.fn(),
}));
```
Then in tests: `(bcrypt.compare as jest.Mock).mockResolvedValue(true);`

**Pattern — `jest.spyOn()` for specific method overrides:**
```typescript
const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
// ... assertions ...
hashSpy.mockRestore();
```

**What to Mock:**
- All external dependencies (PrismaService, JwtService, ConfigService)
- Cryptographic functions (bcryptjs)
- Any module-level import with side effects

**What NOT to Mock:**
- The service under test itself
- NestJS exception classes (real `NotFoundException`, `UnauthorizedException` are thrown)
- Data structures / plain objects

## Fixtures and Factories

**Test Data Pattern:**
All test data is defined as module-level constants in a `// ── Test Data ──` section:
```typescript
const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@oversight.sn',
  password: 'hashed-password',
  firstName: 'Ousmane',
  lastName: 'Diallo',
  role: 'ADMIN' as const,
  isActive: true,
};

const mockUserSafe = {  // Password excluded for safe responses
  id: 'user-uuid-1',
  email: 'admin@oversight.sn',
  firstName: 'Ousmane',
  lastName: 'Diallo',
  role: 'ADMIN',
  isActive: true,
  siteId: 'site-uuid-1',
  createdAt: new Date(),
};

const createData = {
  name: 'New Site',
  city: 'Thiès',
  country: 'SN',
};
```

**Location:**
- Test data is always in-line within the `.spec.ts` file
- No separate fixture files or factories exist
- No shared test data across test files (each file is self-contained)

**Naming:**
- `mockX` — mock service/object: `mockPrismaService`, `mockJwtService`
- `mockY` — test entity data: `mockUser`, `mockAlert`, `mockCamera`
- `mockYSafe` — entity with password excluded: `mockUserSafe`
- `createData` / `updateData` — input data for create/update operations

## Coverage

**Requirements:** No enforcement in CI pipeline (no coverage thresholds configured)

**Config in `apps/api/jest.config.js`:**
```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/main.ts',
  '!src/**/*.module.ts',
  '!src/**/*.d.ts',
],
```

**View Coverage:**
```bash
pnpm --filter @repo/api test:cov
```

**Current coverage gap analysis:**
- Only 5 service files have tests (auth, user, alert, site, camera)
- No controller, guard, pipe, filter, decorator, gateway, or processor tests
- No tests in dashboard, mobile, shared, or UI packages

## Test Types

**Unit Tests (only type currently present):**
- Scope: Service classes in isolation
- Approach: Mock all dependencies, test one service method per `describe` block
- File: `*.service.spec.ts` co-located with source

**Integration Tests:**
- Not used

**E2E Tests:**
- Not used

## Common Patterns

**Async Testing:**
```typescript
it('should return a user by id', async () => {
  mockPrismaService.user.findUnique.mockResolvedValue(mockUserSafe);
  const result = await service.findById('user-uuid-1');
  expect(result).toEqual(mockUserSafe);
  expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
    where: { id: 'user-uuid-1' },
    select: { /* ... */ },
  });
});
```

**Error Testing:**
```typescript
it('should throw NotFoundException if user not found', async () => {
  mockPrismaService.user.findUnique.mockResolvedValue(null);
  await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
});
```

**Paginated Response Testing:**
```typescript
it('should apply pagination (page and limit)', async () => {
  mockPrismaService.alert.findMany.mockResolvedValue([]);
  mockPrismaService.alert.count.mockResolvedValue(0);
  const result = await service.findAll({ page: 2, limit: 10 });
  expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ skip: 10, take: 10 }),
  );
  expect(result).toEqual({ data: [], total: 0, page: 2, limit: 10 });
});
```

**Token Rotation / Security Testing:**
```typescript
it('should revoke all user tokens and throw if token reuse detected', async () => {
  mockPrismaService.refreshToken.findUnique.mockResolvedValue({
    ...storedToken, isRevoked: true,
  });
  mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });
  await expect(service.refresh('reused-uuid')).rejects.toThrow(UnauthorizedException);
  expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
    where: { userId: 'user-uuid-1' },
    data: { isRevoked: true },
  });
});
```

## Adding New Tests

When adding a new service to `apps/api/src/modules/[entity]/`, create `[entity].service.spec.ts` following this template:

1. Imports at top
2. `jest.mock()` for external libs if needed
3. `// ── Mocks ──` section with mock objects
4. `// ── Test Data ──` section with mock entities and input data
5. `// ── Tests ──` section with:
   - `describe('ServiceName', ...)` — top-level suite
   - `beforeEach` creating testing module with `jest.clearAllMocks()`
   - `it('should be defined')` — DI sanity check
   - Nested `describe('methodName', ...)` for each service method
   - At least: success case, not-found error case, and pagination case (for list methods)

---

*Testing analysis: 2026-07-14*
