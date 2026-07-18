import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LicenseService } from "./license.service";
import { activateLicenseSchema } from "@repo/shared";

@ApiTags("licenses")
@Controller("licenses")
export class LicenseController {
  constructor(private licenseService: LicenseService) {}

  @Post("activate")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Activate a license JWT for the current organization" })
  async activate(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(activateLicenseSchema)) body: any,
  ) {
    const orgId = (req as any).user.orgId;
    return this.licenseService.verifyAndActivate(body.licenseJwt, orgId);
  }

  @Get("status")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current license status for your organization" })
  async getStatus(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.licenseService.getLicenseStatus(orgId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all licenses (admin)" })
  async listAll() {
    return this.licenseService.listLicenses();
  }

  @Get("usage")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current usage vs license limits" })
  async getUsage(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.licenseService.getUsage(orgId);
  }
}
