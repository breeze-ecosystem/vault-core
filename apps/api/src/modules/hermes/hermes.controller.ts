import { Controller, Get, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { HermesService } from './hermes.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('hermes')
@Roles('ADMIN', 'SUPER_ADMIN')
export class HermesController {
  constructor(private readonly hermesService: HermesService) {}

  /**
   * GET /api/hermes/status
   * Returns the Hermes Agent WhatsApp connection status.
   */
  @Get('status')
  async getStatus() {
    return this.hermesService.getConnectionStatus();
  }

  /**
   * POST /api/hermes/test
   * Send a test WhatsApp message to the configured number.
   */
  @Post('test')
  async sendTest(@Req() req: FastifyRequest) {
    const user = (req as any).user;
    // For a test, we use the user's phone from their profile or org settings
    const message = `[TEST] Notification WhatsApp OVERSIGHT AI — Test envoyé par ${user?.email ?? 'utilisateur'}`;
    const result = await this.hermesService.sendWhatsApp('', message);
    return result;
  }

  /**
   * GET /api/hermes/qrcode
   * Returns the base64 QR code for WhatsApp Web pairing.
   */
  @Get('qrcode')
  async getQrCode() {
    return this.hermesService.getQrCode();
  }
}
