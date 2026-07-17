# Testing

> Generated: 2026-07-17

## Test Framework

| Stack | Framework | Version | Config File |
|-------|-----------|---------|-------------|
| API (NestJS) | Jest (ts-jest) | 29.7.0 / 29.2.5 | `apps/api/jest.config.js` |
| Dashboard (Next.js) | Not configured | — | — |
| Mobile (Expo) | Not configured | — | — |
| Shared Package | Not configured | — | — |
| AI Preprocessor (Python) | Not configured | — | — |
| Edge Agent (Python) | Not configured | — | — |

**Only the API application has test infrastructure.** Dashboard, Mobile, Shared, AI Preprocessor, and Edge Agent have no test runner, no test scripts, and no test files.

## Test Structure

**File naming:** `*.spec.ts` — co-located with the service under test:
```
apps/api/src/modules/auth/auth.service.spec.ts    # Tests for auth.service.ts
apps/api/src/modules/user/user.service.spec.ts     # Tests for user.service.ts
apps/api/src/modules/camera/camera.service.spec.ts # Tests for camera.service.ts
apps/api/src/modules/site/site.service.spec.ts     # Tests for site.service.ts
apps/api/src/modules/alert/alert.service.spec.ts   # Tests for alert.service.ts
```

**Run Commands** (from `apps/api/`):
```bash
pnpm test              # jest --config jest.config.js
pnpm test:watch        # jest --config jest.config.js --watch
pnpm test:cov          # jest --config jest.config.js --coverage
```

**Test Structure Pattern:**
All test files follow an identical structure with horizontal-rule section separators:

1. Imports
2. `// ── Mocks ──` section — mock objects for PrismaService and other dependencies
3. `// ── Test Data ──` section — mock data objects used across tests
4. `// ── Tests ──` section — the `describe`/`it` blocks

```typescript
// auth.service.spec.ts — structural example
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

const mockPrismaService = { ... }; // all model methods mocked

const mockUser = { id: 'user-uuid-1', email: 'admin@oversight.sn', ... };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated results', async () => { ... });
  });
});
```

**Suite Organization per File:**
- Top-level `describe('ServiceName')` for the service
- `it('should be defined')` — bare-minimum definition check
- `describe('methodName')` blocks for each service method
- Each describe contains:
  - Happy-path test
  - Edge case tests (empty results, null checks)
  - Error-case tests (not found throws, validation failures)

## Mocking Strategy

**Framework:** Jest manual mocks via `jest.fn()`

**Pattern:** Mock objects created at module scope, provided via NestJS TestingModule:

```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  camera: {
    findMany: jest.fn(),
    // ...
  },
};
```

**What is mocked:**
- `PrismaService` — all model methods are mocked at the top level
- `JwtService` — `sign()` is mocked to return a fixed token string
- `ConfigService` — `get()` is mocked to return defaults
- `bcryptjs` — `hash()` and `compare()` are mocked via `jest.mock()` at module level:
  ```typescript
  jest.mock('bcryptjs', () => ({
    __esModule: true,
    ...jest.requireActual('bcryptjs'),
    compare: jest.fn(),
    hash: jest.fn(),
  }));
  ```

**What is NOT mocked:**
- NestJS `TestingModule` itself — real dependency injection container is used
- `Test.createTestingModule` compiles real modules with provided stubs

**Mock setup in `beforeEach`:**
- `jest.clearAllMocks()` resets all mock call counts
- Mock return values configured per-test via `mockResolvedValue()` or `mockImplementation()`

## Coverage

**Configuration** (`apps/api/jest.config.js`):
```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/main.ts',
  '!src/**/*.module.ts',
  '!src/**/*.d.ts',
],
```

- Coverage collection is configured but **no threshold is enforced**.
- Excludes entry point (`main.ts`), all module definition files (`*.module.ts`), and declaration files (`*.d.ts`).
- Coverage is only generated when running `pnpm test:cov`.
- **Dashboard, Mobile, and Shared packages have no coverage configuration at all.**

**Current coverage state:**
- Only 5 service files have tests out of 43+ service files in `apps/api/src/modules/`
- Test files only exist for: `auth.service`, `user.service`, `camera.service`, `site.service`, `alert.service`
- Untested services include: `ai.service`, `access.service`, `analytics.service`, `audit.service`, `chat.service`, `compliance.service`, `correlation.service`, `dashboard.service`, `door.service`, `equipment.service`, `incident.service`, `inference.service`, `ingestion.service`, `license.service`, `notifications.service`, `organization.service`, `risk.service`, `sso.service`, `supervision.service`, `visitor.service`, `webhook.service`, and more
- No controller tests, no e2e tests, no integration tests exist

## CI Integration

- **No CI configuration detected.** No `.github/workflows/` directory exists.
- No automated test runs, no coverage gates, no lint checks in CI.
- No pre-commit hooks or Husky configuration found.
- No `test` task defined in root `turbo.json` — `test` is only available in `apps/api/package.json`.

## Test Patterns

### NestJS TestingModule Pattern
All tests use `@nestjs/testing` to create an isolated module with mocked providers:

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: PrismaService, useValue: mockPrismaService },
    { provide: JwtService, useValue: mockJwtService },
    { provide: ConfigService, useValue: mockConfigService },
  ],
}).compile();

service = module.get<AuthService>(AuthService);
```

### Standard Error Throwing Pattern
Testing that NotFoundException is thrown when entity not found:

```typescript
it('should throw NotFoundException if user not found', async () => {
  mockPrismaService.user.findUnique.mockResolvedValue(null);
  await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
});
```

### Prisma Call Verification Pattern
Verifying the exact arguments passed to Prisma:

```typescript
expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    orderBy: { createdAt: 'desc' },
    select: expect.objectContaining({
      id: true, email: true,
    }),
  }),
);

expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
  where: { id: storedToken.id },
  data: { isRevoked: true },
});
```

### Return Value Assertion Pattern
```typescript
const result = await service.login('admin@oversight.sn', 'password123');
expect(result).toHaveProperty('accessToken');
expect(result).toHaveProperty('refreshToken');
expect(result.organization.name).toBe('Test Org');
expect(result.user.email).toBe('admin@oversight.sn');
```

### Pagination Assertion Pattern
```typescript
const result = await service.findAll({ page: 2, limit: 10 });
expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
  expect.objectContaining({ skip: 10, take: 10 }),
);
expect(result).toEqual({ data: [], total: 0, page: 2, limit: 10 });
```

### Async Spy Pattern (for mocking library methods used as async)
```typescript
it('should hash the password before saving', async () => {
  const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
  await service.register(registerData);
  expect(hashSpy).toHaveBeenCalledWith(registerData.password, 10);
  hashSpy.mockRestore();
});
```

### Test Data Organization
Test data objects defined once at module scope, reused across tests:

```typescript
const mockCamera = {
  id: 'cam-uuid-1',
  name: 'Entrée Principale',
  rtspUrl: 'rtsp://10.0.0.1:554/stream',
  status: 'ONLINE',
  ...
};

const createData = { name: 'Nouvelle Caméra', rtspUrl: '...', ... };
const updateData = { name: 'Caméra Mise à Jour' };
```

Mock data uses French-language field values consistent with the application domain (Senegalese context).

---

*Testing analysis: 2026-07-17*
