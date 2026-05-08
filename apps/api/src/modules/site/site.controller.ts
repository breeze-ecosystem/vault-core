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
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SiteService } from './site.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { createSiteSchema, updateSiteSchema } from '@repo/shared';

@Controller('sites')
export class SiteController {
  constructor(
    private siteService: SiteService,
    private auditService: AuditService,
  ) {}

  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('city') city?: string,
  ) {
    return this.siteService.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      city,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.siteService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async create(
    @Body(new ZodValidationPipe(createSiteSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.siteService.create(body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'CREATE',
      entity: 'site',
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSiteSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.siteService.update(id, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'site',
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
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string, @Req() req: FastifyRequest) {
    const result = await this.siteService.remove(id);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'site',
      entityId: id,
      request: req,
    });

    return result;
  }
}
