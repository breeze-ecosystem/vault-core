import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { VisitorService } from "./visitor.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  preregisterSchema,
  checkInSchema,
  checkOutSchema,
  visitorQuerySchema,
} from "@repo/shared";

@Controller("visitors")
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  // ── Pre-registration ──

  @Post("preregister")
  @Roles("ADMIN", "SUPERVISOR")
  async preregister(
    @Body(new ZodValidationPipe(preregisterSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.visitorService.preregister(
      {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || undefined,
        phone: body.phone || undefined,
        company: body.company || undefined,
        hostUserId: body.hostUserId,
        purpose: body.purpose || undefined,
        validFrom: new Date(body.validFrom),
        validUntil: new Date(body.validUntil),
        zoneIds: body.zoneIds || undefined,
      },
      user.id,
    );
  }

  // ── Check-in / Check-out / Cancel ──

  @Post("visits/:id/check-in")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async checkIn(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.visitorService.checkIn(id, user.id);
  }

  @Post("visits/:id/check-out")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async checkOut(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.visitorService.checkOut(id, user.id);
  }

  @Post("visits/:id/cancel")
  @Roles("ADMIN", "SUPERVISOR")
  async cancelVisit(@Param("id") id: string) {
    return this.visitorService.cancelVisit(id);
  }

  // ── List Visits ──

  @Get("visits")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async listVisits(
    @Query("status") status?: string,
    @Query("hostUserId") hostUserId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.visitorService.listVisits({
      status,
      hostUserId,
      from,
      to,
      siteId: user?.siteId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ── Get Single Visit ──

  @Get("visits/:id")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getVisit(@Param("id") id: string) {
    return this.visitorService.getVisit(id);
  }

  // ── List Visitors ──

  @Get()
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async listVisitors(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.visitorService.listVisitors({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ── Get Single Visitor ──

  @Get(":id")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async getVisitor(@Param("id") id: string) {
    return this.visitorService.getVisitor(id);
  }
}
