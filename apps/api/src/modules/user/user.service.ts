import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { InviteService } from '../organization/invite/invite.service';
import { ModemService } from '../modem/modem.service';
import { VISION_MAX_SECONDARY_USERS } from '@repo/shared';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private inviteService: InviteService,
    private modemService: ModemService,
  ) {}

  /**
   * Check if the organization can add more secondary users (VISION limit).
   * VISION allows a maximum of VISION_MAX_SECONDARY_USERS (3) secondary accounts.
   * @throws BadRequestException if the limit is reached with BASTION upgrade message.
   */
  private async checkSecondaryUserLimit(orgId: string): Promise<void> {
    const activeMemberCount = await this.prisma.organizationMember.count({
      where: {
        organizationId: orgId,
        isActive: true,
        role: { in: ['ADMIN', 'VIEWER'] as Role[] },
      },
    });

    if (activeMemberCount >= VISION_MAX_SECONDARY_USERS) {
      throw new BadRequestException(
        'Limite de 3 utilisateurs secondaires atteinte. Passez à BASTION pour plus d\'utilisateurs.',
      );
    }
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
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
        isActive: true,
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
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });
  }

  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
  }) {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
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
        isActive: true,
      },
    });
  }

  // ── VISION Multi-User Management ──

  async inviteByEmail(email: string, role: string, orgId: string, createdByUserId: string) {
    await this.checkSecondaryUserLimit(orgId);

    // Validate role for VISION (only ADMIN and VIEWER allowed per D-21)
    if (role !== 'ADMIN' && role !== 'VIEWER') {
      throw new BadRequestException('Rôle non autorisé. Utilisez ADMIN ou VIEWER.');
    }

    // Delegate to InviteService for actual invite creation and email sending
    return this.inviteService.createInvite(orgId, email, role, createdByUserId);
  }

  async inviteBySms(phoneNumber: string, role: string, orgId: string, createdByUserId: string) {
    await this.checkSecondaryUserLimit(orgId);

    // Validate role for VISION
    if (role !== 'ADMIN' && role !== 'VIEWER') {
      throw new BadRequestException('Rôle non autorisé. Utilisez ADMIN ou VIEWER.');
    }

    // Generate a temporary password for the new user
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create the user with a placeholder email
    // The user will change their password on first login
    const user = await this.prisma.user.create({
      data: {
        email: `sms_${phoneNumber.replace(/[^0-9]/g, '')}_${Date.now()}@temp.vault-os.local`,
        password: hashedPassword,
        firstName: 'Invité',
        lastName: 'SMS',
      },
    });

    // Create the organization membership
    await this.prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: role as Role,
      },
    });

    // Send SMS with credentials
    const smsMessage = `Bienvenue sur OVERSIGHT HUB. Vos identifiants temporaires: ${user.email} / Mot de passe: ${tempPassword}. Veuillez changer votre mot de passe à la première connexion.`;
    await this.modemService.sendSms(phoneNumber, smsMessage);

    this.logger.log(`SMS invite sent to ${phoneNumber} for org ${orgId}`);

    return {
      userId: user.id,
      email: user.email,
      message: 'Invitation envoyée par SMS',
    };
  }

  async createManually(
    data: { email: string; firstName: string; lastName: string; password: string; role: string },
    orgId: string,
    createdByUserId: string,
  ) {
    await this.checkSecondaryUserLimit(orgId);

    // Validate role for VISION
    if (data.role !== 'ADMIN' && data.role !== 'VIEWER') {
      throw new BadRequestException('Rôle non autorisé. Utilisez ADMIN ou VIEWER.');
    }

    // Check for existing user with this email
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    let userId: string;

    if (existing) {
      // User exists — check if already a member of this org
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existing.id,
            organizationId: orgId,
          },
        },
      });
      if (existingMember) {
        throw new ConflictException('Cet utilisateur est déjà membre de cette organisation');
      }
      userId = existing.id;
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const newUser = await this.prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
      userId = newUser.id;
    }

    // Create organization membership
    await this.prisma.organizationMember.create({
      data: {
        userId,
        organizationId: orgId,
        role: data.role as Role,
      },
    });

    this.logger.log(`Manual user created: ${data.email} (${data.role}) for org ${orgId}`);

    return {
      userId,
      email: data.email,
      role: data.role,
      message: 'Utilisateur créé avec succès',
    };
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
