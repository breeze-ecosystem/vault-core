import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

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
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async findAll() {
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
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
    siteId?: string | null;
  }) {
    return this.prisma.user.update({
      where: { id },
      data: data as any,
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

  async updatePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hash },
    });

    return { message: "Password updated" };
  }
}
