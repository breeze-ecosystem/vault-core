import { Injectable, Logger, UnauthorizedException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async generateToken(
    orgId: string,
    cameraIds: string[],
    durationHours: number,
    createdByUserId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);

    // Sign JWT with share payload (T-02-11: JWT-signed tokens with HMAC)
    const payload = {
      cameraIds,
      orgId,
      type: "stream_share",
    };

    const shareSecret = this.config.get<string>(
      "JWT_SHARE_SECRET",
      "change-me-share-secret-in-prod",
    );
    const token = this.jwt.sign(payload, {
      secret: shareSecret,
      expiresIn: `${durationHours}h`,
    });

    // Persist share record in DB
    const share = await this.prisma.streamShare.create({
      data: {
        organizationId: orgId,
        token,
        cameraIds: cameraIds,
        durationHours,
        expiresAt,
        status: "ACTIVE",
        createdById: createdByUserId,
      },
    });

    this.logger.log(`Stream share created: ${share.id} (${durationHours}h, ${cameraIds.length} camera(s))`);

    return { token, expiresAt };
  }

  async verifyToken(token: string): Promise<{ cameraIds: string[]; shareId: string }> {
    // First verify JWT signature and expiry (T-02-11)
    let payload: { cameraIds: string[]; orgId: string; type: string };
    try {
      const shareSecret = this.config.get<string>(
        "JWT_SHARE_SECRET",
        "change-me-share-secret-in-prod",
      );
      payload = this.jwt.verify(token, { secret: shareSecret }) as any;
    } catch {
      throw new UnauthorizedException("Lien invalide ou expiré");
    }

    // Validate token type
    if (payload.type !== "stream_share") {
      throw new UnauthorizedException("Type de jeton invalide");
    }

    // Then check DB status (T-02-11: double barrier)
    const share = await this.prisma.streamShare.findUnique({
      where: { token },
    });

    if (!share) {
      throw new UnauthorizedException("Lien de partage introuvable");
    }

    if (share.status === "REVOKED") {
      throw new UnauthorizedException("Ce lien de partage a été révoqué");
    }

    if (share.status === "EXPIRED" || share.expiresAt < new Date()) {
      throw new UnauthorizedException("Ce lien de partage a expiré");
    }

    // Record access
    await this.recordAccess(share.id);

    return { cameraIds: payload.cameraIds, shareId: share.id };
  }

  async revokeShare(shareId: string): Promise<void> {
    const share = await this.prisma.streamShare.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new NotFoundException("Lien de partage introuvable");
    }

    await this.prisma.streamShare.update({
      where: { id: shareId },
      data: { status: "REVOKED" },
    });

    this.logger.log(`Stream share revoked: ${shareId}`);
  }

  async getActiveShares(orgId: string) {
    const shares = await this.prisma.streamShare.findMany({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return shares.map((s) => ({
      id: s.id,
      token: s.token,
      cameraIds: s.cameraIds,
      durationHours: s.durationHours,
      expiresAt: s.expiresAt,
      status: s.status,
      createdAt: s.createdAt,
      lastAccessedAt: s.lastAccessedAt,
      accessCount: s.accessCount,
      createdBy: s.createdBy,
    }));
  }

  async recordAccess(shareId: string): Promise<void> {
    await this.prisma.streamShare.update({
      where: { id: shareId },
      data: {
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    });

    // Trigger notification to the share owner via event
    const share = await this.prisma.streamShare.findUnique({
      where: { id: shareId },
      include: { createdBy: true },
    });

    if (share) {
      this.eventEmitter.emit("share.accessed", {
        shareId: share.id,
        createdById: share.createdById,
        accessedAt: new Date(),
      });
    }
  }

  /**
   * Mark expired StreamShare records every 15 minutes.
   */
  @Cron("0 */15 * * * *")
  async expireShares(): Promise<void> {
    try {
      const result = await this.prisma.streamShare.updateMany({
        where: {
          status: "ACTIVE",
          expiresAt: { lt: new Date() },
        },
        data: {
          status: "EXPIRED",
        },
      });

      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} stream share(s)`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to expire shares: ${err.message}`);
    }
  }

  async getAccessLog(shareId: string): Promise<{
    accessCount: number;
    lastAccessedAt: Date | null;
  }> {
    const share = await this.prisma.streamShare.findUnique({
      where: { id: shareId },
      select: { accessCount: true, lastAccessedAt: true },
    });

    if (!share) {
      throw new NotFoundException("Lien de partage introuvable");
    }

    return {
      accessCount: share.accessCount,
      lastAccessedAt: share.lastAccessedAt,
    };
  }
}
