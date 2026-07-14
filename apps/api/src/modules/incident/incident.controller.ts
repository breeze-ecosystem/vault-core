import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { IncidentService } from "./incident.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  createIncidentSchema,
  updateIncidentStatusSchema,
  assignIncidentSchema,
  addCommentSchema,
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
      siteId: user?.siteId,
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
}
