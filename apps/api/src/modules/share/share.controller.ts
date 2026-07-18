import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Query,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ShareService } from "./share.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { createStreamShareSchema } from "@repo/shared";

@ApiTags("shares")
@Controller("shares")
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Post()
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate a new stream share link" })
  async createShare(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(createStreamShareSchema)) body: any,
  ) {
    const orgId = (req as any).user.orgId;
    const userId = (req as any).user.id;
    return this.shareService.generateToken(
      orgId,
      body.cameraIds,
      body.durationHours,
      userId,
    );
  }

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List active shares for the organization" })
  async listShares(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.shareService.getActiveShares(orgId);
  }

  @Delete(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke a share link" })
  async revokeShare(@Param("id") id: string) {
    await this.shareService.revokeShare(id);
    return { message: "Lien de partage révoqué" };
  }

  @Get(":id/access-log")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "View share access log (count and last access time)" })
  async getAccessLog(@Param("id") id: string) {
    return this.shareService.getAccessLog(id);
  }

  @Get("stream/:token")
  @Public()
  @ApiOperation({
    summary: "Public endpoint to access a shared stream (no auth required)",
  })
  async accessSharedStream(@Param("token") token: string) {
    const result = await this.shareService.verifyToken(token);
    // Return the camera IDs that can be accessed through this share
    return {
      cameraIds: result.cameraIds,
      streamUrls: result.cameraIds.map((cid) => ({
        cameraId: cid,
        // Stream URLs are served through the go2rtc streaming server
        // The client will use its configured NEXT_PUBLIC_STREAM_URL
        streamPath: `/stream/${cid}`,
      })),
    };
  }
}
