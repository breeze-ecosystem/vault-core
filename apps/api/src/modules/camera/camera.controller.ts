import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CameraService } from './camera.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { LicenseExpiryGuard } from '../license/guards/license-expiry.guard';
import { AuditService } from '../audit/audit.service';
import { createCameraSchema, updateCameraSchema, ptzContinuousSchema, ptzGotoPresetSchema, ptzSavePresetSchema } from '@repo/shared';
import { AlertSeverity } from '@prisma/client';

@Controller('cameras')
export class CameraController {
  constructor(
    private cameraService: CameraService,
    private auditService: AuditService,
  ) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cameraService.findAll({
      status,
      organizationId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.cameraService.findById(id);
  }

  @Post()
  @UseGuards(LicenseExpiryGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
  async create(
    @Body(new ZodValidationPipe(createCameraSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.cameraService.create(body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'CREATE',
      entity: 'camera',
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCameraSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.cameraService.update(id, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'camera',
      entityId: id,
      changes: Object.keys(body).reduce((acc, key) => {
        acc[key] = { new: body[key] };
        return acc;
      }, {} as Record<string, { old?: unknown; new: unknown }>),
      request: req,
    });

    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Param('id') id: string, @Req() req: FastifyRequest) {
    const result = await this.cameraService.remove(id);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'camera',
      entityId: id,
      request: req,
    });

    return result;
  }

  // ── Camera Prompts ──

  @Get(':id/prompts')
  async getPrompts(@Param('id') cameraId: string) {
    return this.cameraService.getPrompts(cameraId);
  }

  @Post(':id/prompts')
  @Roles('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
  async addPrompt(
    @Param('id') cameraId: string,
    @Body() body: { text: string; severity?: AlertSeverity },
    @Req() req: FastifyRequest,
  ) {
    const result = await this.cameraService.addPrompt(cameraId, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'CREATE',
      entity: 'camera_prompt',
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Patch(':cameraId/prompts/:promptId')
  @Roles('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
  async updatePrompt(
    @Param('cameraId') _cameraId: string,
    @Param('promptId') promptId: string,
    @Body() body: { text?: string; severity?: AlertSeverity; isActive?: boolean },
    @Req() req: FastifyRequest,
  ) {
    const result = await this.cameraService.updatePrompt(promptId, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'camera_prompt',
      entityId: promptId,
      request: req,
    });

    return result;
  }

  @Delete(':cameraId/prompts/:promptId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deletePrompt(
    @Param('cameraId') _cameraId: string,
    @Param('promptId') promptId: string,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.cameraService.deletePrompt(promptId);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'camera_prompt',
      entityId: promptId,
      request: req,
    });

    return result;
  }

  // ── PTZ Controls (Phase 2, D-06, D-16) ──

  @Post(':id/ptz/continuous')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
  async ptzContinuous(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ptzContinuousSchema)) body: { pan: number; tilt: number; zoom: number },
  ) {
    const camera = await this.cameraService.findById(id);
    const caps = camera.ptzCapabilities as { hasPtz?: boolean } | null;
    if (!caps?.hasPtz) {
      throw new BadRequestException('Cette caméra ne supporte pas PTZ');
    }
    return this.cameraService.sendPtzCommand(id, 'ContinuousMove', body);
  }

  @Post(':id/ptz/stop')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
  async ptzStop(@Param('id') id: string) {
    return this.cameraService.sendPtzCommand(id, 'Stop', {});
  }

  @Post(':id/ptz/goto-preset')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
  async ptzGotoPreset(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ptzGotoPresetSchema)) body: { presetToken: string },
  ) {
    return this.cameraService.sendPtzCommand(id, 'GotoPreset', body);
  }

  @Post(':id/ptz/save-preset')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
  async ptzSavePreset(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ptzSavePresetSchema)) body: { name: string },
  ) {
    return this.cameraService.savePreset(id, body.name);
  }
}
