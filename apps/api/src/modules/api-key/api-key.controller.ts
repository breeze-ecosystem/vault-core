import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequiresFeature } from "../../common/decorators/feature-gate.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ApiKeyService } from "./api-key.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { createTenantApiKeySchema } from "@repo/shared";

@ApiTags("api-keys")
@Controller("api-keys")
@UseGuards(JwtAuthGuard)
@Roles("ADMIN")
@RequiresFeature("api_access")
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * POST /api/api-keys
   * Create a new tenant-scoped API key.
   * Returns the raw key ONCE — it will not be shown again.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new API key (returns raw key once)" })
  @ApiBearerAuth()
  async createKey(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(createTenantApiKeySchema)) body: any,
  ) {
    const user = (req as any).user;
    const orgId = user.orgId;
    return this.apiKeyService.createKey(orgId, user.id, body);
  }

  /**
   * GET /api/api-keys
   * List all API keys for the current org (masked — never returns rawKey).
   */
  @Get()
  @ApiOperation({ summary: "List API keys (masked display info only)" })
  @ApiBearerAuth()
  async listKeys(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.apiKeyService.listKeys(orgId);
  }

  /**
   * DELETE /api/api-keys/:id
   * Revoke an API key.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke an API key" })
  @ApiBearerAuth()
  async revokeKey(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
  ) {
    const orgId = (req as any).user.orgId;
    return this.apiKeyService.revokeKey(id, orgId);
  }

  /**
   * GET /api/api-keys/:id/usage
   * Get usage stats for a key (lastUsedAt, rateLimit).
   */
  @Get(":id/usage")
  @ApiOperation({ summary: "Get API key usage statistics" })
  @ApiBearerAuth()
  async getKeyUsage(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
  ) {
    const orgId = (req as any).user.orgId;
    return this.apiKeyService.getKeyUsage(orgId, id);
  }
}
