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
  Res,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { GovernanceService } from "./governance.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequiresPack } from "../../common/decorators/feature-gate.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import {
  createRetentionPolicySchema,
  updateRetentionPolicySchema,
} from "@repo/shared";

@Controller("governance")
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  // ── BASTION Retention Policies (Phase 4) ──

  @Get("retention-policies")
  @RequiresPack("BASTION")
  @Roles("ADMIN")
  async listPolicies(
    @Query("orgId") orgId?: string,
    @Query("siteId") siteId?: string,
  ) {
    return this.governanceService.listPolicies(orgId, siteId);
  }

  @Post("retention-policies")
  @RequiresPack("BASTION")
  @Roles("ADMIN")
  @Audited({ action: "retention.create", entity: "RetentionPolicy" })
  async createPolicy(
    @Body(new ZodValidationPipe(createRetentionPolicySchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).organizationId;
    return this.governanceService.createPolicy(body);
  }

  @Patch("retention-policies/:id")
  @RequiresPack("BASTION")
  @Roles("ADMIN")
  @Audited({ action: "retention.update", entity: "RetentionPolicy" })
  async updatePolicy(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRetentionPolicySchema)) body: any,
  ) {
    return this.governanceService.updatePolicy(id, body);
  }

  @Delete("retention-policies/:id")
  @RequiresPack("BASTION")
  @Roles("ADMIN")
  @Audited({ action: "retention.delete", entity: "RetentionPolicy" })
  async deletePolicy(@Param("id") id: string) {
    await this.governanceService.deletePolicy(id);
    return { success: true };
  }

  @Post("retention-policies/:id/export")
  @Roles("ADMIN")
  async exportBeforePurge(
    @Param("id") id: string,
    @Res() reply: FastifyReply,
  ) {
    const policy = await this.governanceService.listPolicies();
    const targetPolicy = (policy as any[]).find((p: any) => p.id === id);
    if (!targetPolicy) {
      return reply.status(404).send({ error: "Politique de rétention non trouvée" });
    }

    const result = await this.governanceService.exportBeforePurge(
      targetPolicy.eventType,
      targetPolicy.tableType,
      targetPolicy.retentionDays,
      targetPolicy.exportFormat || "CSV",
    );

    if (result.buffer) {
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="retention-export-${targetPolicy.eventType}-${new Date().toISOString().split("T")[0]}.pdf"`,
      );
      return reply.send(result.buffer);
    }

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      `attachment; filename="retention-export-${targetPolicy.eventType}-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    return reply.send(result.text || "");
  }

  @Get("retention-policies/classifications")
  @Roles("ADMIN")
  async getClassifications() {
    return this.governanceService.getClassifications();
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
