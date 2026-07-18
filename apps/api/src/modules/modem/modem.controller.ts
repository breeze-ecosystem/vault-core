import { Controller, Get, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ModemService } from './modem.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('modem')
@Roles('ADMIN', 'SUPER_ADMIN')
export class ModemController {
  constructor(private readonly modemService: ModemService) {}

  /**
   * GET /api/modem/status
   * Returns the GSM modem detection and connection status.
   */
  @Get('status')
  async getStatus() {
    return this.modemService.getModemStatus();
  }

  /**
   * POST /api/modem/test
   * Send a test SMS via the GSM modem.
   */
  @Post('test')
  async sendTest(@Req() req: FastifyRequest) {
    // In a real scenario, the phone number comes from the request body
    // This endpoint is a placeholder for the dashboard to trigger a test
    const message = `[TEST] OVERSIGHT AI — Test SMS de notification`;
    return this.modemService.sendSms('', message);
  }
}
