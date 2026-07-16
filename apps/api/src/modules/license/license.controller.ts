import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LicenseService } from "./license.service";
import { LicenseApiKeyGuard } from "./guards/license-api-key.guard";
import {
  generateLicenseSchema,
  activateLicenseSchema,
  createApiKeySchema,
} from "@repo/shared";

@ApiTags("licenses")
@Controller("licenses")
export class LicenseController {
  constructor(private licenseService: LicenseService) {}

  /**
   * POST /api/licenses/generate
   * Generate a new signed license JWT for an organization.
   * Authenticated via API key (X-API-Key header), not user JWT (D-04).
   */
  @Post("generate")
  @UseGuards(LicenseApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Generate a new license JWT (API key auth)" })
  async generate(
    @Body(new ZodValidationPipe(generateLicenseSchema)) body: any,
  ) {
    return this.licenseService.generateLicense(body);
  }

  /**
   * POST /api/licenses/activate
   * Activate a license JWT for the current organization.
   * Verifies signature, org binding, and expiration.
   */
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

  /**
   * GET /api/licenses/status
   * Get the current license state, expiry, and limits for the user's org.
   */
  @Get("status")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current license status for your organization" })
  async getStatus(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.licenseService.getLicenseStatus(orgId);
  }

  /**
   * GET /api/licenses
   * List all licenses across all orgs (admin only).
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all licenses (admin)" })
  async listAll() {
    return this.licenseService.listLicenses();
  }

  /**
   * GET /api/licenses/usage
   * Get current camera/door usage against license limits.
   */
  @Get("usage")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current usage vs license limits" })
  async getUsage(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.licenseService.getUsage(orgId);
  }

  /**
   * POST /api/licenses/api-keys
   * Create a new API key for programmatic license generation (admin).
   */
  @Post("api-keys")
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new API key (admin)" })
  async createApiKey(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(createApiKeySchema)) body: any,
  ) {
    const user = (req as any).user;
    return this.licenseService.createApiKey(body.name, user.id, user.organizationId);
  }

  /**
   * GET /api/licenses/api-keys
   * List all API keys with display info (admin).
   */
  @Get("api-keys")
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List API keys (admin)" })
  async listApiKeys() {
    return this.licenseService.listAllApiKeys();
  }

  /**
   * DELETE /api/licenses/api-keys/:id
   * Revoke an API key (admin).
   */
  @Delete("api-keys/:id")
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke an API key (admin)" })
  async revokeApiKey(@Param("id") id: string) {
    return this.licenseService.revokeApiKey(id);
  }
}
