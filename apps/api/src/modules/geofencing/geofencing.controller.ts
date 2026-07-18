import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { GeofencingService } from './geofencing.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('geofencing')
export class GeofencingController {
  constructor(private readonly geofencingService: GeofencingService) {}

  /**
   * POST /api/geofencing/heartbeat
   * Mobile app sends heartbeat with WiFi SSID to indicate presence.
   * Authenticated — userId extracted from JWT.
   */
  @Post('heartbeat')
  async heartbeat(
    @Req() req: FastifyRequest,
    @Body() body: { ssid: string },
  ) {
    const userId = (req as any).user.id;
    await this.geofencingService.postHeartbeat(body.ssid, userId);
    return { success: true };
  }

  /**
   * POST /api/geofencing/disconnected
   * Mobile app notifies that WiFi disconnected.
   */
  @Post('disconnected')
  async disconnected(@Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    await this.geofencingService.disconnected(userId);
    return { success: true };
  }

  /**
   * GET /api/geofencing/status
   * Get current arm/disarm state.
   */
  @Get('status')
  async getStatus(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    return this.geofencingService.getArmStatus(orgId);
  }

  /**
   * GET /api/geofencing/config
   * Get geofencing configuration.
   */
  @Get('config')
  async getConfig(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    return this.geofencingService.getConfig(orgId);
  }

  /**
   * PATCH /api/geofencing/config
   * Update geofencing configuration. Admin only.
   */
  @Patch('config')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateConfig(
    @Req() req: FastifyRequest,
    @Body() body: any,
  ) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    return this.geofencingService.updateConfig(orgId, body);
  }

  /**
   * POST /api/geofencing/force-arm
   * Manual override to arm the system.
   */
  @Post('force-arm')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async forceArm(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    await this.geofencingService.forceArm(orgId);
    return { success: true, message: 'Armement manuel activé' };
  }

  /**
   * POST /api/geofencing/force-disarm
   * Manual override to disarm the system.
   */
  @Post('force-disarm')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async forceDisarm(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.organizationId ?? (req as any).orgId;
    await this.geofencingService.forceDisarm(orgId);
    return { success: true, message: 'Désarmement manuel activé' };
  }
}
