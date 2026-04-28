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
import { SiteService } from "./site.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { createSiteSchema, updateSiteSchema } from "@repo/shared";

@Controller("sites")
export class SiteController {
  constructor(private siteService: SiteService) {}

  @Get()
  async findAll(
    @Query("isActive") isActive?: string,
    @Query("city") city?: string
  ) {
    return this.siteService.findAll({
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      city,
    });
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.siteService.findById(id);
  }

  @Post()
  @Roles("ADMIN", "SUPER_ADMIN")
  async create(@Body(new ZodValidationPipe(createSiteSchema)) body: any) {
    return this.siteService.create(body);
  }

  @Patch(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSiteSchema)) body: any
  ) {
    return this.siteService.update(id, body);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  async remove(@Param("id") id: string) {
    return this.siteService.remove(id);
  }
}
