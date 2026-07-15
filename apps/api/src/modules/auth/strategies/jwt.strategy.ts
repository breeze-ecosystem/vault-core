import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET", "change-me-access-secret-in-prod"),
    });
  }

  async validate(payload: { sub: string; email: string; orgId: string; role: string }) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: payload.sub,
          organizationId: payload.orgId,
        },
      },
      select: { isActive: true, role: true },
    });

    if (!membership || !membership.isActive) {
      throw new UnauthorizedException("Organization membership inactive");
    }

    return {
      id: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      role: membership.role, // Server-side verified (not just JWT claim) — D-06
    };
  }
}
