import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (admin only)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity (camera, site, user, alert, setting)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT)' })
  @ApiQuery({ name: 'from', required: false, description: 'From date (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'To date (ISO string)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 50)' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async getLogs(
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLogs(
      {
        userId,
        entity,
        action,
        from,
        to,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated audit log statistics (admin only)' })
  @ApiQuery({ name: 'from', required: false, description: 'From date (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'To date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Audit log statistics' })
  async getStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.getStats({ from, to });
  }
}
