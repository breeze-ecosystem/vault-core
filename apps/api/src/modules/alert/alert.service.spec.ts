import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AlertService } from './alert.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPrismaService = {
  alert: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

// ── Test Data ──────────────────────────────────────────────────────────────────

const mockAlert = {
  id: 'alert-uuid-1',
  title: 'Intrusion détectée',
  description: 'Personne détectée dans la zone restreinte',
  severity: 'HIGH',
  status: 'OPEN',
  cameraId: 'cam-uuid-1',
  snapshotUrl: 'https://cdn.oversight.sn/snapshots/alert-1.jpg',
  metadata: { confidence: 0.92 },
  acknowledgedBy: null,
  acknowledgedAt: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  camera: { id: 'cam-uuid-1', name: 'Entrée Principale', site: { id: 'site-uuid-1', name: 'Dakar Port' } },
};

const createData = {
  title: 'Nouvelle alerte',
  severity: 'CRITICAL' as const,
  camera: { connect: { id: 'cam-uuid-1' } },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

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

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated alerts with total count', async () => {
      mockPrismaService.alert.findMany.mockResolvedValue([mockAlert]);
      mockPrismaService.alert.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({ data: [mockAlert], total: 1, page: 1, limit: 20 });
    });

    it('should filter by severity', async () => {
      mockPrismaService.alert.findMany.mockResolvedValue([mockAlert]);
      mockPrismaService.alert.count.mockResolvedValue(1);

      await service.findAll({ severity: 'HIGH' });

      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: 'HIGH' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.alert.findMany.mockResolvedValue([mockAlert]);
      mockPrismaService.alert.count.mockResolvedValue(1);

      await service.findAll({ status: 'OPEN' });

      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
    });

    it('should filter by cameraId', async () => {
      mockPrismaService.alert.findMany.mockResolvedValue([mockAlert]);
      mockPrismaService.alert.count.mockResolvedValue(1);

      await service.findAll({ cameraId: 'cam-uuid-1' });

      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cameraId: 'cam-uuid-1' }),
        }),
      );
    });

    it('should apply pagination (page and limit)', async () => {
      mockPrismaService.alert.findMany.mockResolvedValue([]);
      mockPrismaService.alert.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(mockPrismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual({ data: [], total: 0, page: 2, limit: 10 });
    });

    it('should return empty list when no alerts exist', async () => {
      mockPrismaService.alert.findMany.mockResolvedValue([]);
      mockPrismaService.alert.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return an alert by id', async () => {
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);

      const result = await service.findById('alert-uuid-1');

      expect(result).toEqual(mockAlert);
      expect(mockPrismaService.alert.findUnique).toHaveBeenCalledWith({
        where: { id: 'alert-uuid-1' },
        include: {
          camera: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw NotFoundException if alert not found', async () => {
      mockPrismaService.alert.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a new alert', async () => {
      const createdAlert = { ...mockAlert, ...createData };
      mockPrismaService.alert.create.mockResolvedValue(createdAlert);

      const result = await service.create(createData);

      expect(result).toEqual(createdAlert);
      expect(mockPrismaService.alert.create).toHaveBeenCalledWith({
        data: createData,
        include: { camera: { select: { id: true, name: true } } },
      });
    });
  });

  // ── acknowledge ─────────────────────────────────────────────────────────

  describe('acknowledge', () => {
    it('should acknowledge an alert', async () => {
      const acknowledgedAlert = {
        ...mockAlert,
        status: 'ACKNOWLEDGED',
        acknowledgedBy: 'user-uuid-1',
        acknowledgedAt: expect.any(Date),
      };
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrismaService.alert.update.mockResolvedValue(acknowledgedAlert);

      const result = await service.acknowledge('alert-uuid-1', 'user-uuid-1');

      expect(result.status).toBe('ACKNOWLEDGED');
      expect(mockPrismaService.alert.update).toHaveBeenCalledWith({
        where: { id: 'alert-uuid-1' },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: 'user-uuid-1',
          acknowledgedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if alert not found on acknowledge', async () => {
      mockPrismaService.alert.findUnique.mockResolvedValue(null);

      await expect(service.acknowledge('nonexistent', 'user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── resolve ─────────────────────────────────────────────────────────────

  describe('resolve', () => {
    it('should resolve an alert', async () => {
      const resolvedAlert = {
        ...mockAlert,
        status: 'RESOLVED',
        resolvedBy: 'user-uuid-1',
        resolvedAt: expect.any(Date),
      };
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrismaService.alert.update.mockResolvedValue(resolvedAlert);

      const result = await service.resolve('alert-uuid-1', 'user-uuid-1');

      expect(result.status).toBe('RESOLVED');
      expect(mockPrismaService.alert.update).toHaveBeenCalledWith({
        where: { id: 'alert-uuid-1' },
        data: {
          status: 'RESOLVED',
          resolvedBy: 'user-uuid-1',
          resolvedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if alert not found on resolve', async () => {
      mockPrismaService.alert.findUnique.mockResolvedValue(null);

      await expect(service.resolve('nonexistent', 'user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── markFalsePositive ───────────────────────────────────────────────────

  describe('markFalsePositive', () => {
    it('should mark an alert as false positive', async () => {
      const falsePositiveAlert = {
        ...mockAlert,
        status: 'FALSE_POSITIVE',
        resolvedBy: 'user-uuid-1',
        resolvedAt: expect.any(Date),
      };
      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrismaService.alert.update.mockResolvedValue(falsePositiveAlert);

      const result = await service.markFalsePositive('alert-uuid-1', 'user-uuid-1');

      expect(result.status).toBe('FALSE_POSITIVE');
      expect(mockPrismaService.alert.update).toHaveBeenCalledWith({
        where: { id: 'alert-uuid-1' },
        data: {
          status: 'FALSE_POSITIVE',
          resolvedBy: 'user-uuid-1',
          resolvedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if alert not found on markFalsePositive', async () => {
      mockPrismaService.alert.findUnique.mockResolvedValue(null);

      await expect(service.markFalsePositive('nonexistent', 'user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
