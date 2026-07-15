import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  ...jest.requireActual('bcryptjs'),
  compare: jest.fn(),
  hash: jest.fn(),
}));

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

// ── Test Data ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@oversight.sn',
  password: 'hashed-password',
  firstName: 'Ousmane',
  lastName: 'Diallo',
  isActive: true,
  createdAt: new Date(),
};

const mockUserSafe = {
  id: 'user-uuid-1',
  email: 'admin@oversight.sn',
  firstName: 'Ousmane',
  lastName: 'Diallo',
  isActive: true,
  createdAt: new Date(),
};

const updateData = {
  firstName: 'Amadou',
  lastName: 'Ba',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all users ordered by createdAt desc', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUserSafe]);

      const result = await service.findAll();

      expect(result).toEqual([mockUserSafe]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty list when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should select only safe fields (no password)', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUserSafe]);

      await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          }),
        }),
      );
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserSafe);

      const result = await service.findById('user-uuid-1');

      expect(result).toEqual(mockUserSafe);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the user', async () => {
      const updatedUser = { ...mockUserSafe, ...updateData };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-uuid-1', updateData);

      expect(result.firstName).toBe('Amadou');
      expect(result.lastName).toBe('Ba');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { firstName: 'Amadou', lastName: 'Ba' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
    });
  });

  // ── updatePassword ──────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('should update password when current password is valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, password: 'new-hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.updatePassword('user-uuid-1', 'old-pass', 'new-pass');

      expect(result).toEqual({ message: 'Password updated' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { password: 'new-hash' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('new-pass', 10);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('nonexistent', 'old', 'new'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updatePassword('user-uuid-1', 'wrong-pass', 'new-pass'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
