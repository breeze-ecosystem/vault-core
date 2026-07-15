import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CameraService } from './camera.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPrismaService = {
  camera: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  cameraPrompt: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

// ── Test Data ──────────────────────────────────────────────────────────────────

const mockCamera = {
  id: 'cam-uuid-1',
  name: 'Entrée Principale',
  rtspUrl: 'rtsp://10.0.0.1:554/stream',
  status: 'ONLINE',
  organizationId: 'site-uuid-1',
  resolution: '1920x1080',
  fps: 25,
  captureInterval: 5,
  isRecording: false,
  lastSnapshotUrl: null,
  lastHeartbeat: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  organization: { id: 'org-uuid-1', name: 'Dakar Port' },
  prompts: [],
  _count: { alerts: 3 },
};

const mockPrompt = {
  id: 'prompt-uuid-1',
  cameraId: 'cam-uuid-1',
  text: 'Détecter toute intrusion',
  severity: 'HIGH',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createData = {
  name: 'Nouvelle Caméra',
  rtspUrl: 'rtsp://10.0.0.5:554/stream',
  organization: { connect: { id: 'site-uuid-1' } },
};

const updateData = {
  name: 'Caméra Mise à Jour',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CameraService', () => {
  let service: CameraService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CameraService>(CameraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated cameras with total count', async () => {
      mockPrismaService.camera.findMany.mockResolvedValue([mockCamera]);
      mockPrismaService.camera.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({ data: [mockCamera], total: 1 });
    });

    it('should filter by status', async () => {
      mockPrismaService.camera.findMany.mockResolvedValue([mockCamera]);
      mockPrismaService.camera.count.mockResolvedValue(1);

      await service.findAll({ status: 'ONLINE' });

      expect(mockPrismaService.camera.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ONLINE' }),
        }),
      );
    });

    it('should filter by organizationId', async () => {
      mockPrismaService.camera.findMany.mockResolvedValue([mockCamera]);
      mockPrismaService.camera.count.mockResolvedValue(1);

      await service.findAll({ organizationId: 'site-uuid-1' });

      expect(mockPrismaService.camera.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'site-uuid-1' }),
        }),
      );
    });

    it('should return empty list when no cameras exist', async () => {
      mockPrismaService.camera.findMany.mockResolvedValue([]);
      mockPrismaService.camera.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a camera by id with site and prompts', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(mockCamera);

      const result = await service.findById('cam-uuid-1');

      expect(result).toEqual(mockCamera);
      expect(mockPrismaService.camera.findUnique).toHaveBeenCalledWith({
        where: { id: 'cam-uuid-1' },
        include: {
          organization: { select: { id: true, name: true } },
          prompts: { orderBy: { createdAt: 'desc' } },
          alerts: { take: 10, orderBy: { createdAt: 'desc' } },
        },
      });
    });

    it('should throw NotFoundException if camera not found', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a new camera', async () => {
      const created = { ...mockCamera, ...createData };
      mockPrismaService.camera.create.mockResolvedValue(created);

      const result = await service.create(createData);

      expect(result).toEqual(created);
      expect(mockPrismaService.camera.create).toHaveBeenCalledWith({
        data: createData,
        include: { organization: { select: { id: true, name: true } } },
      });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the camera', async () => {
      const updated = { ...mockCamera, name: 'Caméra Mise à Jour' };
      mockPrismaService.camera.findUnique.mockResolvedValue(mockCamera);
      mockPrismaService.camera.update.mockResolvedValue(updated);

      const result = await service.update('cam-uuid-1', updateData);

      expect(result.name).toBe('Caméra Mise à Jour');
    });

    it('should throw NotFoundException if camera not found on update', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a camera', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(mockCamera);
      mockPrismaService.camera.delete.mockResolvedValue(mockCamera);

      const result = await service.remove('cam-uuid-1');

      expect(result).toEqual(mockCamera);
      expect(mockPrismaService.camera.delete).toHaveBeenCalledWith({
        where: { id: 'cam-uuid-1' },
      });
    });

    it('should throw NotFoundException if camera not found on remove', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Prompt management ───────────────────────────────────────────────────

  describe('getPrompts', () => {
    it('should return prompts for a camera', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(mockCamera);
      mockPrismaService.cameraPrompt.findMany.mockResolvedValue([mockPrompt]);

      const result = await service.getPrompts('cam-uuid-1');

      expect(result).toEqual([mockPrompt]);
    });

    it('should throw NotFoundException if camera not found', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(null);

      await expect(service.getPrompts('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPrompt', () => {
    it('should add a prompt to a camera', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(mockCamera);
      mockPrismaService.cameraPrompt.create.mockResolvedValue(mockPrompt);

      const result = await service.addPrompt('cam-uuid-1', {
        text: 'Détecter intrusion',
        severity: 'HIGH',
      });

      expect(result).toEqual(mockPrompt);
      expect(mockPrismaService.cameraPrompt.create).toHaveBeenCalledWith({
        data: {
          cameraId: 'cam-uuid-1',
          text: 'Détecter intrusion',
          severity: 'HIGH',
        },
      });
    });

    it('should default severity to MEDIUM if not provided', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(mockCamera);
      mockPrismaService.cameraPrompt.create.mockResolvedValue({
        ...mockPrompt,
        severity: 'MEDIUM',
      });

      await service.addPrompt('cam-uuid-1', { text: 'Some prompt' });

      expect(mockPrismaService.cameraPrompt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ severity: 'MEDIUM' }),
      });
    });

    it('should throw NotFoundException if camera not found', async () => {
      mockPrismaService.camera.findUnique.mockResolvedValue(null);

      await expect(
        service.addPrompt('nonexistent', { text: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePrompt', () => {
    it('should update a prompt', async () => {
      const updatedPrompt = { ...mockPrompt, text: 'Updated prompt' };
      mockPrismaService.cameraPrompt.findUnique.mockResolvedValue(mockPrompt);
      mockPrismaService.cameraPrompt.update.mockResolvedValue(updatedPrompt);

      const result = await service.updatePrompt('prompt-uuid-1', {
        text: 'Updated prompt',
      });

      expect(result.text).toBe('Updated prompt');
    });

    it('should throw NotFoundException if prompt not found', async () => {
      mockPrismaService.cameraPrompt.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePrompt('nonexistent', { text: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt', async () => {
      mockPrismaService.cameraPrompt.findUnique.mockResolvedValue(mockPrompt);
      mockPrismaService.cameraPrompt.delete.mockResolvedValue(mockPrompt);

      const result = await service.deletePrompt('prompt-uuid-1');

      expect(result).toEqual(mockPrompt);
    });

    it('should throw NotFoundException if prompt not found', async () => {
      mockPrismaService.cameraPrompt.findUnique.mockResolvedValue(null);

      await expect(service.deletePrompt('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
