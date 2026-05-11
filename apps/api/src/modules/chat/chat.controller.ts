import {
  Controller,
  Post,
  Body,
  Get,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat
   * Send a message to the AI surveillance assistant
   */
  @Post()
  async chat(@Req() req: FastifyRequest, @Body() dto: ChatMessageDto) {
    const userId = (req as any).user.id;
    return this.chatService.handleMessage(userId, dto);
  }

  /**
   * GET /chat/cameras
   * List cameras available for AI queries (with online status)
   */
  @Get('cameras')
  async getCamerasForChat(@Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    return this.chatService.getCamerasForChat(userId);
  }

  /**
   * GET /chat/history
   * Get recent chat history for the user
   */
  @Get('history')
  async getHistory(@Req() req: FastifyRequest) {
    const userId = (req as any).user.id;
    return this.chatService.getHistory(userId);
  }
}
