import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SiteService } from './site.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPrismaService = {
  site: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

// ── Test Data ──────────────────────────────────────────────────────────────────

const mockSite = {
  id: 'site-uuid-1',
  name: 'Dakar Port',
  address: 'Port Autonome de Dakar',
  city: 'Dakar',
  country: 'SN',
  latitude: 14.672,
  longitude: -17.438,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  cameras: [],
  _count: { cameras: 0, users: 1 },
};

const createData = {
  name: 'New Site',
  city: 'Thiès',
  country: 'SN',
};

const updateData = {
  name: 'Updated Site Name',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SiteService', () => {
  let service: SiteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SiteService>(SiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated sites with total count', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({ data: [mockSite], total: 1 });
      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      await service.findAll({ isActive: true });

      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should filter by city (case-insensitive)', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      await service.findAll({ city: 'dakar' });

      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'dakar', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should return empty list when no sites exist', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([]);
      mockPrismaService.site.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a site by id', async () => {
      mockPrismaService.site.findUnique.mockResolvedValue(mockSite);

      const result = await service.findById('site-uuid-1');

      expect(result).toEqual(mockSite);
      expect(mockPrismaService.site.findUnique).toHaveBeenCalledWith({
        where: { id: 'site-uuid-1' },
        include: { cameras: true, _count: { select: { users: true } } },
      });
    });

    it('should throw NotFoundException if site not found', async () => {
      mockPrismaService.site.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a new site', async () => {
      const createdSite = { ...mockSite, ...createData };
      mockPrismaService.site.create.mockResolvedValue(createdSite);

      const result = await service.create(createData);

      expect(result).toEqual(createdSite);
      expect(mockPrismaService.site.create).toHaveBeenCalledWith({ data: createData });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the site', async () => {
      const updatedSite = { ...mockSite, name: 'Updated Site Name' };
      mockPrismaService.site.findUnique.mockResolvedValue(mockSite);
      mockPrismaService.site.update.mockResolvedValue(updatedSite);

      const result = await service.update('site-uuid-1', updateData);

      expect(result.name).toBe('Updated Site Name');
      expect(mockPrismaService.site.update).toHaveBeenCalledWith({
        where: { id: 'site-uuid-1' },
        data: updateData,
      });
    });

    it('should throw NotFoundException if site not found on update', async () => {
      mockPrismaService.site.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete a site (set isActive=false)', async () => {
      const deactivatedSite = { ...mockSite, isActive: false };
      mockPrismaService.site.findUnique.mockResolvedValue(mockSite);
      mockPrismaService.site.update.mockResolvedValue(deactivatedSite);

      const result = await service.remove('site-uuid-1');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.site.update).toHaveBeenCalledWith({
        where: { id: 'site-uuid-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if site not found on remove', async () => {
      mockPrismaService.site.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
