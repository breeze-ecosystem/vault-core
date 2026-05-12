import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        siteId: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(params?: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params || {};
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        siteId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async count() {
    return this.prisma.user.count();
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    siteId?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: (data.role as Role) || 'VIEWER',
        siteId: data.siteId || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        siteId: true,
      },
    });
  }

  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
    siteId?: string | null;
  }) {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.role !== undefined) updateData.role = data.role as Role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.siteId !== undefined) {
      updateData.site = data.siteId
        ? { connect: { id: data.siteId } }
        : { disconnect: true };
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        siteId: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete — deactivate the user
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hash },
    });

    return { message: 'Password updated' };
  }
}
