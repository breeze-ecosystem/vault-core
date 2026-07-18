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
  ForbiddenException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UpdateUserDto, UserResponseDto, PaginationQueryDto } from '../../common/dto';
import { VISION_MAX_SECONDARY_USERS } from '@repo/shared';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private auditService: AuditService,
  ) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAll(@Query() query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await Promise.all([
      this.userService.findAll({ page: Number(page), limit: Number(limit) }),
      this.userService.count(),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Cannot view other users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string, @Req() req: FastifyRequest) {
    const currentUser = (req as any).user;
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN' && currentUser.id !== id) {
      throw new ForbiddenException();
    }
    return this.userService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  async create(@Body() body: any, @Req() req: FastifyRequest) {
    const result = await this.userService.create(body);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'CREATE',
      entity: 'user',
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile or role' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Cannot update other users' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: FastifyRequest,
  ) {
    const currentUser = (req as any).user;
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    if (!isAdmin && currentUser.id !== id) {
      throw new ForbiddenException();
    }

    const data: any = {};
    if (body.firstName) data.firstName = body.firstName;
    if (body.lastName) data.lastName = body.lastName;
    if (isAdmin && body.isActive !== undefined) data.isActive = body.isActive;
    // role moved to OrganizationMember; user-org association via OrganizationMember

    const result = await this.userService.update(id, data);

    await this.auditService.log({
      userId: currentUser.id,
      action: 'UPDATE',
      entity: 'user',
      entityId: id,
      changes: Object.keys(data).reduce((acc, key) => {
        acc[key] = { new: data[key] };
        return acc;
      }, {} as Record<string, { old?: unknown; new: unknown }>),
      request: req,
    });

    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete/deactivate a user (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async remove(@Param('id') id: string, @Req() req: FastifyRequest) {
    const result = await this.userService.remove(id);

    await this.auditService.log({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'user',
      entityId: id,
      request: req,
    });

    return result;
  }

  // ── VISION Multi-User Management ──

  @Post('invite-email')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Invite a user by email (VISION: max 3 secondary users)' })
  @ApiResponse({ status: 201, description: 'Invite sent' })
  @ApiResponse({ status: 400, description: 'Limit reached or invalid role' })
  async inviteByEmail(
    @Body() body: { email: string; role: string },
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).user.orgId;
    const userId = (req as any).user.id;
    const result = await this.userService.inviteByEmail(body.email, body.role, orgId, userId);

    await this.auditService.log({
      userId,
      action: 'INVITE',
      entity: 'user',
      entityId: result.id,
      request: req,
    });

    return result;
  }

  @Post('invite-sms')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Invite a user by SMS (VISION: max 3 secondary users)' })
  @ApiResponse({ status: 201, description: 'Invite sent via SMS' })
  @ApiResponse({ status: 400, description: 'Limit reached or invalid role' })
  async inviteBySms(
    @Body() body: { phoneNumber: string; role: string },
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).user.orgId;
    const userId = (req as any).user.id;
    return this.userService.inviteBySms(body.phoneNumber, body.role, orgId, userId);
  }

  @Post('create-manual')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a user manually with temporary password (VISION: max 3 secondary users)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Limit reached, invalid role, or duplicate' })
  async createManual(
    @Body() body: { email: string; firstName: string; lastName: string; password: string; role: string },
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).user.orgId;
    const userId = (req as any).user.id;
    const result = await this.userService.createManually(body, orgId, userId);

    await this.auditService.log({
      userId,
      action: 'CREATE',
      entity: 'user',
      entityId: result.userId,
      request: req,
    });

    return result;
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async changePassword(
    @Param('id') id: string,
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: FastifyRequest,
  ) {
    const currentUser = (req as any).user;
    if (currentUser.id !== id) {
      throw new ForbiddenException('You can only change your own password');
    }
    return this.userService.updatePassword(id, body.currentPassword, body.newPassword);
  }
}
