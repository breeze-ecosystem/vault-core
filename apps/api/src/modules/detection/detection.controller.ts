import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { DetectionService } from "./detection.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequiresFeature } from "../../common/decorators/feature-gate.decorator";
import { AuditService } from "../audit/audit.service";
import {
  detectionZoneSchema,
  updateDetectionZoneSchema,
} from "@repo/shared";

@Controller()
export class DetectionController {
  constructor(
    private detectionService: DetectionService,
    private auditService: AuditService,
  ) {}

  @Get("cameras/:cameraId/zones")
  async findZonesByCamera(@Param("cameraId") cameraId: string) {
    return this.detectionService.findZonesByCamera(cameraId);
  }

  @Post("cameras/:cameraId/zones")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_detection_zones")
  async createZone(
    @Param("cameraId") cameraId: string,
    @Body(new ZodValidationPipe(detectionZoneSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.detectionService.createZone(cameraId, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: "CREATE",
      entity: "detection_zone",
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Patch("zones/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_detection_zones")
  async updateZone(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateDetectionZoneSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.detectionService.updateZone(id, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: "UPDATE",
      entity: "detection_zone",
      entityId: id,
      changes: Object.keys(body).reduce(
        (acc, key) => {
          acc[key] = { new: body[key] };
          return acc;
        },
        {} as Record<string, { old?: unknown; new: unknown }>,
      ),
      request: req,
    });

    return result;
  }

  @Delete("zones/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_detection_zones")
  async deleteZone(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
  ) {
    await this.detectionService.deleteZone(id);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: "DELETE",
      entity: "detection_zone",
      entityId: id,
      request: req,
    });

    return { success: true };
  }

  @Get("cameras/:cameraId/detection-config")
  async getDetectionConfig(@Param("cameraId") cameraId: string) {
    return this.detectionService.getDetectionConfig(cameraId);
  }
}
