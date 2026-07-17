import { Controller, Get, Patch, Body, Param, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ControllerService } from "./controller.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import { enrollControllerSchema } from "@repo/shared";

@Controller("controllers")
export class ControllerController {
  constructor(private controllerService: ControllerService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async findAll(@Req() req: FastifyRequest) {
    const user = (req as any)?.user;
    return this.controllerService.findAll(user?.orgId ?? "");
  }

  @Patch(":id/enroll")
  @Audited({ entity: "controller", action: "UPDATE" })
  @Roles("ADMIN", "SUPER_ADMIN")
  async enroll(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(enrollControllerSchema)) body: any,
  ) {
    return this.controllerService.enroll(id, body);
  }
}
