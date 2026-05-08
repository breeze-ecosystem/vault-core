import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * GET /notifications/settings
   * Get the current user's notification settings
   */
  @Get('settings')
  async getSettings(@Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    return this.notificationsService.getUserSettings(userId);
  }

  /**
   * PUT /notifications/settings
   * Update notification settings for the current user
   * Body: { settings: [{ channel, enabled, config }] }
   */
  @Put('settings')
  async updateSettings(
    @Req() req: FastifyRequest,
    @Body() body: { settings: { channel: 'EMAIL' | 'WEBHOOK' | 'IN_APP'; enabled: boolean; config?: any }[] },
  ) {
    const userId = (req as any).user.id;
    return this.notificationsService.updateUserSettings(userId, body.settings);
  }

  /**
   * GET /notifications/logs
   * Paginated notification history
   */
  @Get('logs')
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
  ) {
    return this.notificationsService.getNotificationLogs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      channel,
      status,
    });
  }

  /**
   * POST /notifications/test
   * Send a test notification to the current user
   */
  @Post('test')
  async sendTest(@Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    return this.notificationsService.sendTestNotification(userId);
  }
}
