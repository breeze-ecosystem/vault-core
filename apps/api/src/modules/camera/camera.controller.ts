import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { CameraService } from "./camera.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { createCameraSchema, updateCameraSchema } from "@repo/shared";

@Controller("cameras")
export class CameraController {
  constructor(private cameraService: CameraService) {}

  @Get()
  async findAll(
    @Query("status") status?: string,
    @Query("siteId") siteId?: string
  ) {
    return this.cameraService.findAll({ status, siteId });
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.cameraService.findById(id);
  }

  @Post()
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async create(@Body(new ZodValidationPipe(createCameraSchema)) body: any) {
    return this.cameraService.create(body);
  }

  @Patch(":id")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCameraSchema)) body: any
  ) {
    return this.cameraService.update(id, body);
  }

  @Delete(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async remove(@Param("id") id: string) {
    return this.cameraService.remove(id);
  }
}
