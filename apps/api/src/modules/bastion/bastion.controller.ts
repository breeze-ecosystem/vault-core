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
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { BastionService } from "./bastion.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantIsolationGuard } from "../../common/guards/tenant-isolation.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { FeatureGateGuard } from "../../common/guards/feature-gate.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import { RequiresPack, RequiresModule } from "../../common/decorators/feature-gate.decorator";
import { createFaceSchema } from "@repo/shared";

@Controller("bastion")
@RequiresPack("BASTION")
@UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
export class BastionController {
  constructor(private bastionService: BastionService) {}

  // ── Face Enrollment ──

  @Post("faces")
  @Audited({ entity: "face", action: "CREATE", captureChanges: true })
  @Roles("ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async enrollFace(
    @Body(new ZodValidationPipe(createFaceSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.bastionService.enrollFace({
      ...body,
      organizationId: user?.orgId,
    });
  }

  @Get("faces")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async listFaces(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("blacklisted") blacklisted?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.bastionService.listFaces({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      blacklisted: blacklisted !== undefined ? blacklisted === "true" : undefined,
      organizationId: user?.orgId,
    });
  }

  @Get("faces/:id")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async getFace(@Param("id") id: string) {
    return this.bastionService.getFace(id);
  }

  @Patch("faces/:id")
  @Audited({ entity: "face", action: "UPDATE", captureChanges: true })
  @Roles("ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async updateFace(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.bastionService.updateFace(id, { ...body, organizationId: user?.orgId });
  }

  @Delete("faces/:id")
  @Audited({ entity: "face", action: "DELETE" })
  @Roles("ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async deleteFace(@Param("id") id: string) {
    return this.bastionService.deleteFace(id);
  }

  @Post("faces/:id/toggle-blacklist")
  @Audited({ entity: "face", action: "UPDATE", captureChanges: true })
  @Roles("ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async toggleBlacklist(@Param("id") id: string) {
    return this.bastionService.toggleBlacklist(id);
  }

  @Get("faces/:id/passages")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async getFacePassages(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.bastionService.getFacePassages(id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ── Passage History ──

  @Get("passages")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async listPassages(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("cameraId") cameraId?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.bastionService.listPassages({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      cameraId,
      organizationId: user?.orgId,
    });
  }
}
