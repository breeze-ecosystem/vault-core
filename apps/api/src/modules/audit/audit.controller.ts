import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { auditQuerySchema, auditVerifySchema, auditExportSchema } from "@repo/shared";
import type { AuditQueryInput, AuditVerifyInput, AuditExportInput } from "@repo/shared";

@ApiTags("audit")
@ApiBearerAuth()
@Controller("audit")
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * GET /api/audit/logs
   * Paginated audit log with filters. Admin and Auditor roles.
   */
  @Get("logs")
  @Roles("ADMIN", "AUDITOR")
  @ApiOperation({ summary: "List audit logs with filters (admin, auditor)" })
  @ApiQuery({ name: "entity", required: false })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiQuery({ name: "siteId", required: false })
  @ApiQuery({ name: "action", required: false })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({ status: 200, description: "Paginated audit logs" })
  async getLogs(
    @Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQueryInput,
  ) {
    return this.auditService.queryAuditLog(query);
  }

  /**
   * GET /api/audit/verify
   * Verify cryptographic hash chain integrity for a given entity.
   */
  @Get("verify")
  @Roles("ADMIN", "AUDITOR")
  @ApiOperation({ summary: "Verify hash chain integrity (admin, auditor)" })
  @ApiQuery({ name: "entity", required: true })
  @ApiQuery({ name: "entityId", required: true })
  @ApiResponse({ status: 200, description: "Chain verification result" })
  async verifyChain(
    @Query(new ZodValidationPipe(auditVerifySchema)) query: AuditVerifyInput,
  ) {
    return this.auditService.verifyChain(query.entity, query.entityId);
  }

  /**
   * GET /api/audit/export
   * Export filtered audit log as JSON or CSV download.
   */
  @Get("export")
  @Roles("ADMIN", "AUDITOR")
  @ApiOperation({ summary: "Export audit logs (admin, auditor)" })
  @ApiResponse({ status: 200, description: "Audit log export file" })
  async exportAuditLog(
    @Query(new ZodValidationPipe(auditExportSchema)) query: AuditExportInput,
    @Res() res: FastifyReply,
  ) {
    const result = await this.auditService.exportAuditLog(query);
    const format = query.format ?? "json";

    if (format === "csv") {
      res.header("Content-Type", "text/csv; charset=utf-8");
      res.header(
        "Content-Disposition",
        `attachment; filename="audit-export-${new Date().toISOString().split("T")[0]}.csv"`,
      );
      return res.send(result.text);
    }

    res.header("Content-Type", "application/json; charset=utf-8");
    res.header(
      "Content-Disposition",
      `attachment; filename="audit-export-${new Date().toISOString().split("T")[0]}.json"`,
    );
    return res.send(result.text);
  }

  /**
   * GET /api/audit/stats
   * Aggregated audit statistics.
   */
  @Get("stats")
  @Roles("ADMIN", "AUDITOR")
  @ApiOperation({ summary: "Get audit log statistics (admin, auditor)" })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiResponse({ status: 200, description: "Audit statistics" })
  async getStats(
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.auditService.getAuditStats(from, to);
  }
}
