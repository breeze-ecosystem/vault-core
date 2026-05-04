import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("audit")
@UseGuards(JwtAuthGuard)
@Roles("ADMIN")
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async getLogs(
    @Query("userId") userId?: string,
    @Query("entity") entity?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.auditService.getLogs({
      userId,
      entity,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }
}
