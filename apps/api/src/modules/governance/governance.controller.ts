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
import type { FastifyRequest } from "fastify";
import { GovernanceService } from "./governance.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  createRetentionPolicySchema,
  updateRetentionPolicySchema,
} from "@repo/shared";

@Controller("governance")
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get("retention-policies")
  @Roles("ADMIN")
  async listPolicies() {
    return this.governanceService.listPolicies();
  }

  @Post("retention-policies")
  @Roles("ADMIN")
  async createPolicy(
    @Body(new ZodValidationPipe(createRetentionPolicySchema)) body: any,
  ) {
    return this.governanceService.createPolicy(body);
  }

  @Patch("retention-policies/:id")
  @Roles("ADMIN")
  async updatePolicy(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRetentionPolicySchema)) body: any,
  ) {
    return this.governanceService.updatePolicy(id, body);
  }

  @Delete("retention-policies/:id")
  @Roles("ADMIN")
  async deletePolicy(@Param("id") id: string) {
    await this.governanceService.deletePolicy(id);
    return { success: true };
  }

  @Post("encrypt")
  @Roles("ADMIN")
  async encrypt(@Body("value") value: string) {
    if (!value) {
      return { error: "value is required" };
    }
    const encrypted = await this.governanceService.encrypt(value);
    return { encrypted };
  }

  @Post("decrypt")
  @Roles("ADMIN")
  async decrypt(@Body("value") value: string) {
    if (!value) {
      return { error: "value is required" };
    }
    const decrypted = await this.governanceService.decrypt(value);
    return { decrypted };
  }

  @Get("status")
  @Roles("ADMIN", "SUPERVISOR")
  async status() {
    return {
      encryptionConfigured: this.governanceService.isEncryptionConfigured(),
    };
  }
}
