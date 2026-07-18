import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { ComplianceService } from "./compliance.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { RequiresPack } from "../../common/decorators/feature-gate.decorator";
import { AuditLog } from "../../modules/audit/audit.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  hapdpDeclarationSchema,
  consentSignageSchema,
} from "@repo/shared";
import { z } from "zod";

const generateComplianceReportSchema = z.object({
  reportType: z.enum(["soc2", "iso27001", "access-review"], {
    errorMap: () => ({ message: "Type de rapport invalide (soc2, iso27001, access-review)" }),
  }),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

@Controller("compliance")
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Post("reports/generate")
  @Roles("ADMIN", "SUPER_ADMIN")
  async generateReport(
    @Body(new ZodValidationPipe(generateComplianceReportSchema)) body: any,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const orgId = (req as any).user.orgId;
    const dateRange = body.dateFrom && body.dateTo
      ? { from: new Date(body.dateFrom), to: new Date(body.dateTo) }
      : undefined;

    const result = await this.complianceService.generateReport({
      orgId,
      reportType: body.reportType,
      dateRange,
    });

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    reply.send(result.buffer);
  }

  @Get("reports")
  @Roles("ADMIN", "SUPER_ADMIN")
  async listReports() {
    // Reports are generated on-demand and downloaded immediately.
    // For MVP, return empty list with guidance.
    return {
      data: [],
      message:
        "Les rapports de conformité sont générés à la demande et téléchargés immédiatement. " +
        "Utilisez POST /api/compliance/reports/generate pour créer un rapport.",
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HAPDP Endpoints (BAS-30 to BAS-35)
  // ──────────────────────────────────────────────────────────────────────────────

  @Post("hapdp/declaration")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresPack("BASTION")
  @AuditLog("HAPDP_DECLARATION_GENERATED", "compliance")
  async generateHapdpDeclaration(
    @Body(new ZodValidationPipe(hapdpDeclarationSchema)) body: any,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const orgId = (req as any).user.orgId;
    const result = await this.complianceService.generateHapdpDeclaration(orgId, body);

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="${result.filename}"`);
    reply.send(result.buffer);
  }

  @Post("hapdp/consent-signage")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresPack("BASTION")
  @AuditLog("CONSENT_SIGNAGE_GENERATED", "compliance")
  async generateConsentSignage(
    @Body(new ZodValidationPipe(consentSignageSchema)) body: any,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const orgId = (req as any).user.orgId;
    const userId = (req as any).user.id;
    const result = await this.complianceService.generateConsentSignage(
      orgId,
      body.cameraId,
      body.siteName,
    );

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="${result.filename}"`);
    reply.send(result.buffer);
  }

  @Get("registre")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  @RequiresPack("BASTION")
  async exportProcessingRegister(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("format") format?: string,
  ) {
    const orgId = (req as any).user.orgId;
    const fmt = (format || "csv").toLowerCase() === "pdf" ? "pdf" : "csv";
    const result = await this.complianceService.generateProcessingRegisterExport(orgId, fmt);

    if (fmt === "csv") {
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${result.filename}"`);
    } else {
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="${result.filename}"`);
    }
    reply.send(result.buffer);
  }

  @Get("registre/entries")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  @RequiresPack("BASTION")
  async listProcessingRegister(
    @Req() req: FastifyRequest,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const orgId = (req as any).user.orgId;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.processingRecord.findMany({
        where: { organizationId: orgId },
        orderBy: { performedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.processingRecord.count({
        where: { organizationId: orgId },
      }),
    ]);

    return { data, total, page, limit };
  }

  @Get("traceability")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RequiresPack("BASTION")
  async getAccessTraceability(
    @Req() req: FastifyRequest,
    @Query("userId") userId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("entityType") entityType?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const orgId = (req as any).user.orgId;

    const filters: Record<string, unknown> = { organizationId: orgId };
    if (userId) {
      // We search by userId in audit logs — need to use AuditService
    }
    if (dateFrom) {
      filters.performedAt = { ...(filters.performedAt as any), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      filters.performedAt = { ...(filters.performedAt as any), lte: new Date(dateTo) };
    }
    if (entityType) {
      filters.entityType = entityType;
    }

    // Traceability queries audit_entries via AuditService
    // For MVP, use AuditLog entries filtered by org
    const result = await this.auditService.queryAuditLog({
      organizationId: orgId,
      userId,
      from: dateFrom,
      to: dateTo,
      entity: entityType,
    });

    return result;
  }
}
