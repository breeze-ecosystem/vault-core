import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { DndService } from './dnd.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dnd')
export class DndController {
  constructor(private readonly dndService: DndService) {}

  /**
   * GET /api/dnd/schedule
   * Get the DND schedule configuration.
   */
  @Get('schedule')
  async getSchedule(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    return this.dndService.getSchedule(orgId);
  }

  /**
   * PATCH /api/dnd/schedule
   * Update the DND schedule configuration. Admin only.
   */
  @Patch('schedule')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateSchedule(
    @Req() req: FastifyRequest,
    @Body() body: { enabled?: boolean; scheduleJson?: any; criticalOverride?: boolean },
  ) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    return this.dndService.updateSchedule(orgId, body);
  }

  /**
   * GET /api/dnd/status
   * Is DND currently active?
   */
  @Get('status')
  async getStatus(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    return this.dndService.getDndStatus(orgId);
  }
}
