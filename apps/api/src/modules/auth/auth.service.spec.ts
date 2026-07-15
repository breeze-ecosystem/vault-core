import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  ...jest.requireActual('bcryptjs'),
  hash: jest.fn(),
  compare: jest.fn(),
}));

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  organizationMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  organization: {
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: any) => any) =>
    fn({
      organization: { create: jest.fn().mockResolvedValue({ id: 'org-uuid-1', name: 'Test Org' }) },
      user: { create: jest.fn().mockResolvedValue({ id: 'user-uuid-1', email: 'new@oversight.sn', firstName: 'Amadou', lastName: 'Ba' }) },
      organizationMember: { create: jest.fn().mockResolvedValue({ id: 'member-uuid-1', userId: 'user-uuid-1', organizationId: 'org-uuid-1', role: 'ADMIN' }) },
    }),
  ),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => defaultValue || 'mock-secret'),
};

// ── Test Data ──────────────────────────────────────────────────────────────────

const now = new Date();
const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@oversight.sn',
  password: 'hashed-password',
  firstName: 'Ousmane',
  lastName: 'Diallo',
  isActive: true,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    const registerData = {
      email: 'new@oversight.sn',
      password: 'password123',
      firstName: 'Amadou',
      lastName: 'Ba',
      organizationName: 'Test Org',
    };

    it('should register a new user with organization successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerData);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('organization');
      expect(result.organization.name).toBe('Test Org');
      expect(result.user.email).toBe('new@oversight.sn');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerData)).rejects.toThrow(ConflictException);
    });

    it('should hash the password before saving', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      await service.register(registerData);

      expect(hashSpy).toHaveBeenCalledWith(registerData.password, 10);
      hashSpy.mockRestore();
    });
  });

  // ── login ───────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organizationMember.findFirst.mockResolvedValue({
        id: 'member-uuid-1',
        userId: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        role: 'ADMIN',
      });
      mockPrismaService.organizationMember.findMany.mockResolvedValue([
        {
          role: 'ADMIN',
          organization: { id: 'org-uuid-1', name: 'Test Org' },
        },
      ]);
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login('admin@oversight.sn', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('organizations');
      expect(result.user.email).toBe('admin@oversight.sn');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login('unknown@test.sn', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login('admin@oversight.sn', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login('admin@oversight.sn', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────────

  describe('refresh', () => {
    const storedToken = {
      id: 'token-id',
      token: 'valid-uuid',
      userId: 'user-uuid-1',
      expiresAt: futureDate,
      isRevoked: false,
      user: mockUser,
    };

    it('should refresh token successfully', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.organizationMember.findFirst.mockResolvedValue({
        id: 'member-uuid-1',
        userId: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        role: 'ADMIN',
      });
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-uuid');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('organization');
      expect(result.user.id).toBe('user-uuid-1');
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException if token not found', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('invalid-uuid')).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke all user tokens and throw if token reuse detected', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        isRevoked: true,
      });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.refresh('reused-uuid')).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException if token expired', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(service.refresh('expired-uuid')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke a specific refresh token', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user-uuid-1', 'some-token');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', token: 'some-token' },
        data: { isRevoked: true },
      });
      expect(result.message).toBe('Logged out successfully');
    });

    it('should revoke all tokens if no refreshToken provided', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.logout('user-uuid-1');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        data: { isRevoked: true },
      });
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
