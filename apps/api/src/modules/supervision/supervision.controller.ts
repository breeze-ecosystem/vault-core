import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SupervisionService } from './supervision.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { RegisterClientDto } from './dto/register-client.dto';

/**
 * Guard that accepts either a valid JWT OR a supervision token.
 * Applied only to supervision endpoints that need auth.
 */
@Injectable()
class SupervisionOrJwtGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(SupervisionOrJwtGuard.name);

  constructor(
    private reflector: Reflector,
    private supervisionService: SupervisionService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Try supervision token first
    const client = this.supervisionService.validateSupervisionToken(token);
    if (client) {
      (request as any).supervisionClient = client;
      return true;
    }

    // Fall through to JWT validation via passport
    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch {
      throw new UnauthorizedException('Invalid JWT or supervision token');
    }
  }
}

@ApiTags('supervision')
@ApiBearerAuth()
@Controller('supervision')
export class SupervisionController {
  private readonly logger = new Logger(SupervisionController.name);

  constructor(private readonly supervisionService: SupervisionService) {}

  /**
   * POST /api/supervision/heartbeat
   * Receive heartbeat from an edge agent.
   * Public — edge agents authenticate via supervision token in body or header.
   */
  @Post('heartbeat')
  @Public()
  @ApiOperation({ summary: 'Receive heartbeat from edge agent' })
  async receiveHeartbeat(@Body() dto: HeartbeatDto) {
    this.supervisionService.recordHeartbeat(dto);
    this.logger.debug(`Heartbeat received from ${dto.clientId}`);
    return { received: true };
  }

  /**
   * GET /api/supervision/clients
   * List all registered clients with last heartbeat.
   * Requires JWT or supervision token.
   */
  @Get('clients')
  @ApiOperation({ summary: 'List all registered edge clients' })
  async listClients() {
    return this.supervisionService.listClients();
  }

  /**
   * GET /api/supervision/clients/:clientId
   * Get a specific client's details.
   */
  @Get('clients/:clientId')
  @ApiOperation({ summary: 'Get specific client details' })
  async getClient(@Param('clientId') clientId: string) {
    const client = this.supervisionService.getClient(clientId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
    return client;
  }

  /**
   * POST /api/supervision/clients/register
   * Register a new edge client.
   * Public — registration itself doesn't require auth (first contact).
   */
  @Post('clients/register')
  @Public()
  @ApiOperation({ summary: 'Register a new edge client' })
  async registerClient(@Body() dto: RegisterClientDto) {
    return this.supervisionService.register(dto);
  }
}
