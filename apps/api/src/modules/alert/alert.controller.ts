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
import { AlertService } from "./alert.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { createAlertSchema } from "@repo/shared";

@Controller("alerts")
export class AlertController {
  constructor(private alertService: AlertService) {}

  @Get()
  async findAll(
    @Query("severity") severity?: string,
    @Query("status") status?: string,
    @Query("cameraId") cameraId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.alertService.findAll({
      severity,
      status,
      cameraId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.alertService.findById(id);
  }

  @Post()
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async create(@Body(new ZodValidationPipe(createAlertSchema)) body: any) {
    return this.alertService.create(body);
  }

  @Patch(":id/acknowledge")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async acknowledge(@Param("id") id: string, @Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    return this.alertService.acknowledge(id, userId);
  }

  @Patch(":id/resolve")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async resolve(@Param("id") id: string, @Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    return this.alertService.resolve(id, userId);
  }

  @Patch(":id/false-positive")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async markFalsePositive(@Param("id") id: string, @Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    return this.alertService.markFalsePositive(id, userId);
  }

  @Delete(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async delete(@Param("id") id: string) {
    return this.alertService.delete(id);
  }
}
