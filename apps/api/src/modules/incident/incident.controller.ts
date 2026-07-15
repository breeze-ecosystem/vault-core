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
import { IncidentService } from "./incident.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import {
  createIncidentSchema,
  updateIncidentStatusSchema,
  assignIncidentSchema,
  addCommentSchema,
  addEvidenceSchema,
} from "@repo/shared";

@Controller("incidents")
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async create(
    @Body(new ZodValidationPipe(createIncidentSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.incidentService.create(body, user.id);
  }

  @Get()
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async findAll(
    @Query("status") status?: string,
    @Query("severity") severity?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.incidentService.findAll({
      status,
      severity,
      assignedToId: assignedTo,
      orgId: user?.orgId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async findById(@Param("id") id: string) {
    return this.incidentService.findById(id);
  }

  @Patch(":id/status")
  @Roles("ADMIN", "SUPERVISOR")
  async transitionStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateIncidentStatusSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.incidentService.transitionStatus(id, body.status, body.reason, user.id);
  }

  @Post(":id/assign")
  @Roles("ADMIN", "SUPERVISOR")
  async assign(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignIncidentSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.incidentService.assignIncident(id, body.userId, user.id, body.note);
  }

  @Post(":id/comments")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async addComment(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addCommentSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.incidentService.addComment(id, body.text, user.id);
  }

  @Get(":id/comments")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getComments(@Param("id") id: string) {
    return this.incidentService.getComments(id);
  }

  @Get(":id/history")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getHistory(@Param("id") id: string) {
    const [assignmentHistory, statusHistory] = await Promise.all([
      this.incidentService.getAssignmentHistory(id),
      this.incidentService.getStatusHistory(id),
    ]);

    return { assignments: assignmentHistory, statusChanges: statusHistory };
  }

  // ── Evidence Endpoints ──

  @Post(":id/evidence")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  @Audited({ entity: "incident_evidence", action: "CREATE" })
  async addEvidence(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addEvidenceSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.incidentService.addEvidence(id, body, user.id);
  }

  @Delete(":id/evidence/:evidenceId")
  @Roles("ADMIN", "SUPERVISOR")
  @Audited({ entity: "incident_evidence", action: "DELETE" })
  async removeEvidence(
    @Param("id") id: string,
    @Param("evidenceId") evidenceId: string,
  ) {
    await this.incidentService.removeEvidence(id, evidenceId);
    return { success: true };
  }

  @Get(":id/evidence")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getEvidence(@Param("id") id: string) {
    return this.incidentService.getEvidence(id);
  }

  @Get(":id/report")
  @Roles("ADMIN", "SUPERVISOR")
  async downloadReport(
    @Param("id") id: string,
    @Res() res: FastifyReply,
  ) {
    const pdfBuffer = await this.incidentService.generateClosureReport(id);

    res.header("Content-Type", "application/pdf");
    res.header(
      "Content-Disposition",
      `attachment; filename="incident-${id.substring(0, 8)}.pdf"`,
    );
    res.header("Content-Length", String(pdfBuffer.length));
    return res.send(pdfBuffer);
  }
}
