import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {}

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Single transaction: Org + User + Member (D-08)
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
          billingEmail: data.email,
          planTier: "FREE",
        },
      });

      const user = await tx.user.create({
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
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "ADMIN",
        },
      });

      return { org, user, member };
    });

    const { accessToken, refreshToken } = await this.createTokens(
      result.user.id,
      result.user.email,
      result.org.id,
      "ADMIN",
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Resolve org context from OrganizationMember (D-06)
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { joinedAt: "asc" },
    });

    if (!membership) {
      throw new UnauthorizedException("No organization membership");
    }

    // Fetch all active memberships for org switcher
    const organizations = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    const { accessToken, refreshToken } = await this.createTokens(
      user.id,
      user.email,
      membership.organizationId,
      membership.role,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organization: {
        id: membership.organizationId,
        role: membership.role,
      },
      organizations: organizations.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    };
  }

  async refresh(oldRefreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (storedToken.isRevoked) {
      // Revoke ALL tokens for this user — possible token theft
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException("Token reuse detected. All sessions revoked.");
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Resolve org context from OrganizationMember (Pitfall 5 mitigation)
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: storedToken.userId, isActive: true },
      orderBy: { joinedAt: "asc" },
    });

    if (!membership) {
      throw new UnauthorizedException("No organization membership");
    }

    const { accessToken, refreshToken } = await this.createTokens(
      storedToken.user.id,
      storedToken.user.email,
      membership.organizationId,
      membership.role,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
      },
      organization: {
        id: membership.organizationId,
        role: membership.role,
      },
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true },
      });
    } else {
      // Logout all sessions
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }
    return { message: "Logged out successfully" };
  }

  async switchOrg(userId: string, targetOrgId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: targetOrgId,
        },
      },
      select: { isActive: true, role: true },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException("Not a member of this organization");
    }

    // Revoke all existing refresh tokens (Pitfall 5 mitigation)
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const result = await this.createTokens(userId, user.email, targetOrgId, membership.role);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: { id: userId, email: user.email },
      organization: { id: targetOrgId, role: membership.role },
    };
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
    }));
  }

  private async createTokens(userId: string, email: string, orgId: string, role: string) {
    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET", "change-me-access-secret-in-prod");
    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET", "change-me-refresh-secret-in-prod");

    const accessToken = this.jwt.sign(
      { sub: userId, email, orgId, role },
      { secret: accessSecret, expiresIn: this.config.get("JWT_ACCESS_EXPIRY", "15m") }
    );

    const refreshTokenUuid = uuidv4();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenUuid,
        userId,
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenUuid };
  }
}
