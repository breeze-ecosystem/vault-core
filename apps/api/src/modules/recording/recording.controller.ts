import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RecordingService } from "./recording.service";
import { RecordingCleanupService } from "./recording-cleanup.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { updateRecordingConfigSchema } from "@repo/shared";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("recording")
@ApiBearerAuth()
@Controller("recording")
export class RecordingController {
  constructor(
    private recordingService: RecordingService,
    private recordingCleanupService: RecordingCleanupService,
  ) {}

  @Get("config")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get recording configuration for the organization" })
  async getConfig(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.recordingService.getConfig(orgId);
  }

  @Patch("config")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Update recording configuration (retention, codec, storage path)" })
  async updateConfig(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(updateRecordingConfigSchema)) body: any,
  ) {
    const orgId = (req as any).user.orgId;
    return this.recordingService.updateConfig(orgId, body);
  }

  @Get("status")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get recording status for all cameras in the organization" })
  async getStatus(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    const cameraIds = this.recordingService.getActiveRecordingIds();
    const statuses = cameraIds.map((cid) => ({
      cameraId: cid,
      ...this.recordingService.getRecordingStatus(cid),
    }));
    return { cameras: statuses, total: statuses.length };
  }

  @Get("storage")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get storage usage for the organization" })
  async getStorage(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.recordingCleanupService.getStorageUsage(orgId);
  }

  @Post("events/:eventId/export")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Export a 30s video clip around an event" })
  async exportClip(@Param("eventId") eventId: string) {
    try {
      const result = await this.recordingService.exportClip(eventId);
      return result;
    } catch (err: any) {
      return { error: err.message || "Erreur lors de l'export de la clip vidéo" };
    }
  }
}
