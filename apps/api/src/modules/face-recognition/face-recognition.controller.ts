import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { FaceRecognitionService } from "./face-recognition.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequiresFeature } from "../../common/decorators/feature-gate.decorator";
import { AuditService } from "../audit/audit.service";
import {
  faceWhitelistSchema,
  updateFaceWhitelistSchema,
} from "@repo/shared";

@Controller()
export class FaceRecognitionController {
  constructor(
    private faceRecognitionService: FaceRecognitionService,
    private auditService: AuditService,
  ) {}

  // ── External endpoints (protected) ──

  @Get("visages")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_face_whitelist")
  async findAll(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    return this.faceRecognitionService.findAll(orgId);
  }

  @Get("visages/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_face_whitelist")
  async findById(@Param("id") id: string) {
    return this.faceRecognitionService.findById(id);
  }

  @Post("visages")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_face_whitelist")
  async create(
    @Body(new ZodValidationPipe(faceWhitelistSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).user?.orgId;
    const result = await this.faceRecognitionService.create(body, orgId);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: "CREATE",
      entity: "face_whitelist",
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Patch("visages/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_face_whitelist")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFaceWhitelistSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.faceRecognitionService.update(id, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: "UPDATE",
      entity: "face_whitelist",
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

  @Delete("visages/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresFeature("vision_face_whitelist")
  async remove(@Param("id") id: string, @Req() req: FastifyRequest) {
    await this.faceRecognitionService.remove(id);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: "DELETE",
      entity: "face_whitelist",
      entityId: id,
      request: req,
    });

    return { success: true };
  }

  // ── Internal endpoint: AI Preprocessor cache refresh ──

  @Get("internal/face-whitelist")
  async getWhitelistForOrg(@Query("organizationId") organizationId: string) {
    if (!organizationId) {
      return { data: [] };
    }
    return this.faceRecognitionService.getWhitelistForOrg(organizationId);
  }
}
