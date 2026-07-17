import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KioskService } from './kiosk.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateZplBadge } from './zpl-badge';

// ── Module-level mocks ─────────────────────────────────────────────────────────
// Mock child_process to spy on exec calls. The mock function lives inside the
// jest.mock factory; we retrieve it via module._mocks or direct require access.
// NOTE: jest.mock replaces the module in the module registry BEFORE any imports.

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  const mockExecFn = jest.fn(
    (
      cmd: string,
      options: any,
      callback?: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      if (typeof options === 'function') {
        callback = options;
      }
      if (callback) {
        callback(null, '', '');
      }
      return undefined as any;
    },
  );
  return {
    ...actual,
    exec: mockExecFn,
    execSync: actual.execSync,
  };
});

jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  };
});

// ── Test mocks ─────────────────────────────────────────────────────────────────

const mockPrismaService = {
  visit: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'PRINTER_IP') return '192.168.1.100';
    return defaultValue || '';
  }),
};

// ── Helper ─────────────────────────────────────────────────────────────────────

function createMockVisit(overrides: Record<string, any> = {}) {
  return {
    id: 'visit-uuid-1',
    visitorId: 'visitor-uuid-1',
    hostUserId: 'host-uuid-1',
    status: 'active',
    validFrom: new Date('2026-07-17T08:00:00Z'),
    validUntil: new Date('2026-07-17T18:00:00Z'),
    checkedInAt: new Date('2026-07-17T09:00:00Z'),
    checkedOutAt: null,
    credentialId: 'cred-uuid-1',
    purpose: 'Meeting',
    zoneRestrictions: null,
    createdAt: new Date('2026-07-16T10:00:00Z'),
    updatedAt: new Date('2026-07-17T09:00:00Z'),
    visitor: {
      id: 'visitor-uuid-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: null,
      company: 'Acme Inc',
      photoUrl: null,
      createdAt: new Date('2026-07-16T10:00:00Z'),
      updatedAt: new Date('2026-07-16T10:00:00Z'),
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('KioskService', () => {
  let service: KioskService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KioskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<KioskService>(KioskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── printBadge ─────────────────────────────────────────────────────────

  describe('printBadge', () => {
    it('should throw NotFoundException when visit does not exist', async () => {
      mockPrismaService.visit.findUnique.mockResolvedValue(null);

      await expect(service.printBadge('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when visit is not active', async () => {
      mockPrismaService.visit.findUnique.mockResolvedValue(
        createMockVisit({ status: 'scheduled', checkedInAt: null }),
      );

      await expect(service.printBadge('visit-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate ZPL and send to CUPS when visit is active', async () => {
      mockPrismaService.visit.findUnique.mockResolvedValue(
        createMockVisit({ status: 'active' }),
      );

      await expect(service.printBadge('visit-uuid-1')).resolves.toBeUndefined();

      // Retrieve the mocked exec module to inspect calls
      const cp = require('child_process') as any;

      // Verify lp command was called with raw ZPL temp file path
      const execCalls = cp.exec.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('lp -d kiosk-printer -o raw'),
      );
      expect(execCalls.length).toBeGreaterThanOrEqual(1);
      expect(execCalls[0][0]).toMatch(
        /lp -d kiosk-printer -o raw "\/tmp\/badge-\d+\.zpl"/,
      );
    });

    it('should throw when CUPS printer is unreachable', async () => {
      mockPrismaService.visit.findUnique.mockResolvedValue(
        createMockVisit({ status: 'active' }),
      );

      // Override the mock for this specific test
      const cp = require('child_process') as any;
      cp.exec.mockImplementation(
        (
          _cmd: string,
          _opts: any,
          callback?: (error: Error | null, stdout: string, stderr: string) => void,
        ) => {
          if (typeof _opts === 'function') {
            callback = _opts;
          }
          if (callback) {
            callback(new Error('Printer unreachable'), '', 'Connection refused');
          }
          return undefined as any;
        },
      );

      await expect(service.printBadge('visit-uuid-1')).rejects.toThrow(
        'Print failed',
      );
    });
  });

  // ── generateZplBadge ───────────────────────────────────────────────────

  describe('generateZplBadge', () => {
    it('should generate valid ZPL with all fields', () => {
      const zpl = generateZplBadge({
        visitorName: 'John Doe',
        hostName: 'Jane Smith',
        date: '17/07/2026 14:30',
        qrContent: 'visit-123',
      });

      expect(zpl.startsWith('^XA')).toBe(true);
      expect(zpl.endsWith('^XZ')).toBe(true);
      expect(zpl).toContain('John Doe');
      expect(zpl).toContain('Jane Smith');
      expect(zpl).toContain('17/07/2026 14:30');
      expect(zpl).toContain('visit-123');
      expect(zpl).toContain('^BQN'); // QR code command
    });

    it('should escape ZPL control characters', () => {
      const zpl = generateZplBadge({
        visitorName: 'John^Doe',
        hostName: 'Jane~Smith',
        date: 'today',
        qrContent: '123',
      });

      expect(zpl.startsWith('^XA')).toBe(true);
      expect(zpl.endsWith('^XZ')).toBe(true);

      // Control characters ^ and ~ should be stripped from text fields
      expect(zpl).not.toContain('John^Doe');
      expect(zpl).not.toContain('Jane~Smith');
      expect(zpl).toContain('JohnDoe');
      expect(zpl).toContain('JaneSmith');
    });
  });

  // ── searchVisits ───────────────────────────────────────────────────────

  describe('searchVisits', () => {
    it('should return empty array when no matches', async () => {
      mockPrismaService.visit.findMany.mockResolvedValue([]);

      const result = await service.searchVisits('nonexistent');
      expect(result).toEqual([]);
    });

    it('should return matching visits with host name', async () => {
      mockPrismaService.visit.findMany.mockResolvedValue([
        {
          id: 'v1',
          visitorId: 'visitor-uuid-1',
          hostUserId: 'host-uuid-1',
          status: 'scheduled',
          validFrom: new Date('2026-07-17T08:00:00Z'),
          validUntil: new Date('2026-07-17T18:00:00Z'),
          checkedInAt: null,
          checkedOutAt: null,
          credentialId: null,
          zoneRestrictions: null,
          createdAt: new Date('2026-07-16T10:00:00Z'),
          updatedAt: new Date('2026-07-16T10:00:00Z'),
          visitor: {
            id: 'visitor-uuid-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: null,
            company: 'Acme Inc',
            photoUrl: null,
            createdAt: new Date('2026-07-16T10:00:00Z'),
            updatedAt: new Date('2026-07-16T10:00:00Z'),
          },
          host: {
            id: 'host-uuid-1',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
          },
        },
      ]);

      const result = await service.searchVisits('John');
      expect(result).toHaveLength(1);
      expect(result[0].visitor.firstName).toBe('John');
      expect(result[0].hostName).toBe('Jane Smith');
    });
  });
});
