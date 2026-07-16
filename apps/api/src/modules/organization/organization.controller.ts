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
import type { FastifyRequest } from 'fastify';
import { OrganizationService } from './organization.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresFeature } from '../../common/decorators/feature-gate.decorator';
import { AuditService } from '../audit/audit.service';
import { createOrganizationSchema, updateOrganizationSchema } from '@repo/shared';

@Controller('organizations')
export class OrganizationController {
  constructor(
    private organizationService: OrganizationService,
    private auditService: AuditService,
  ) {}

  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationService.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      city,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('me')
  async findMyOrganization(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.organizationService.findById(orgId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.organizationService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async create(
    @Body(new ZodValidationPipe(createOrganizationSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.organizationService.create(body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'CREATE',
      entity: 'organization',
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.organizationService.update(id, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'organization',
      entityId: id,
      changes: Object.keys(body).reduce((acc, key) => {
        acc[key] = { new: body[key] };
        return acc;
      }, {} as Record<string, { old?: unknown; new: unknown }>),
      request: req,
    });

    return result;
  }

  @Patch('branding')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequiresFeature('custom_branding')
  async updateBranding(
    @Body() body: { logoUrl?: string; primaryColor?: string; displayName?: string },
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).user.orgId;
    const result = await this.organizationService.updateBranding(orgId, body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'organization',
      entityId: orgId,
      changes: Object.keys(body).reduce((acc, key) => {
        acc[key] = { new: (body as any)[key] };
        return acc;
      }, {} as Record<string, { new: unknown }>),
      request: req,
    });

    return result;
  }

  @Get('branding')
  async getBranding(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    if (!orgId) {
      return { logoUrl: null, primaryColor: null, displayName: null, name: null };
    }
    return this.organizationService.getBranding(orgId);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string, @Req() req: FastifyRequest) {
    const result = await this.organizationService.remove(id);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'organization',
      entityId: id,
      request: req,
    });

    return result;
  }
}
