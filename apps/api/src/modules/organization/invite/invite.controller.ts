import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { InviteService } from "./invite.service";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { Roles } from "../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { createInviteSchema } from "@repo/shared";

@ApiTags("invites")
@ApiBearerAuth()
@Controller("organizations/:orgId/invites")
export class InviteController {
  constructor(private inviteService: InviteService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an invite for a user to join an organization" })
  @ApiResponse({ status: 201, description: "Invite created successfully" })
  @ApiResponse({ status: 409, description: "Pending invite already exists for this email" })
  async create(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createInviteSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as any).user.id;
    return this.inviteService.createInvite(orgId, body.email, body.role, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN", "SUPERVISOR")
  @ApiOperation({ summary: "List all invites for an organization" })
  @ApiResponse({ status: 200, description: "List of invites" })
  async list(@Param("orgId") orgId: string) {
    return this.inviteService.listInvites(orgId);
  }

  @Post(":inviteId/resend")
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend an invite email with a new token" })
  @ApiResponse({ status: 200, description: "Invite resent" })
  @ApiResponse({ status: 400, description: "Cannot resend non-pending invite" })
  @ApiResponse({ status: 404, description: "Invite not found" })
  async resend(
    @Param("orgId") orgId: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.inviteService.resendInvite(orgId, inviteId);
  }

  @Delete(":inviteId")
  @UseGuards(JwtAuthGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke a pending invite" })
  @ApiResponse({ status: 200, description: "Invite revoked" })
  @ApiResponse({ status: 400, description: "Cannot revoke accepted invite" })
  @ApiResponse({ status: 404, description: "Invite not found" })
  async revoke(
    @Param("orgId") orgId: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.inviteService.revokeInvite(orgId, inviteId);
  }
}
