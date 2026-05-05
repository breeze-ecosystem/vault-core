import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";
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
    role?: string;
    siteId?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: (data.role as Role) || "VIEWER",
        siteId: data.siteId || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    const { accessToken, refreshToken } = await this.createTokens(user.id, user.email, user.role);

    return { accessToken, refreshToken, user };
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
        role: true,
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

    const { accessToken, refreshToken } = await this.createTokens(user.id, user.email, user.role);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
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

    const { accessToken, refreshToken } = await this.createTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
        role: storedToken.user.role,
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

  private async createTokens(userId: string, email: string, role: Role) {
    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET", "change-me-access-secret-in-prod");
    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET", "change-me-refresh-secret-in-prod");

    const accessToken = this.jwt.sign(
      { sub: userId, email, role },
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
