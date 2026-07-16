import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
} from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { ComplianceService } from "./compliance.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
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
  constructor(private readonly complianceService: ComplianceService) {}

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
}
