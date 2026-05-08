import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiCookieAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { loginSchema, registerSchema, refreshSchema } from '@repo/shared';
import {
  LoginDto,
  RegisterDto,
  RefreshDto,
  LogoutDto,
  AuthResponseDto,
} from '../../common/dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async register(@Body(new ZodValidationPipe(registerSchema)) body: any) {
    const result = await this.authService.register(body);

    // Audit log for registration
    await this.auditService.log({
      userId: result.user.id,
      action: 'REGISTER',
      entity: 'user',
      entityId: result.user.id,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: any,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(body.email, body.password);

    // Set refresh token as HttpOnly cookie (for web clients)
    res.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: 'lax',
    });

    // Audit log for login
    await this.auditService.log({
      userId: result.user.id,
      action: 'LOGIN',
      entity: 'user',
      entityId: result.user.id,
      request: req,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken, // Also in body for mobile
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshDto })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Token refreshed', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // Try body first (mobile), then cookie (web)
    const refreshToken = body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      const validated = refreshSchema.safeParse({ refreshToken: body.refreshToken });
      if (!validated.success) {
        return { error: 'Refresh token required' };
      }
    }

    const result = await this.authService.refresh(refreshToken!);

    // Rotate cookie
    res.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  @ApiBody({ type: LogoutDto })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: FastifyRequest,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const userId = (req as any).user.id;
    const refreshToken = body.refreshToken || req.cookies?.refreshToken;

    await this.authService.logout(userId, refreshToken);

    res.clearCookie('refreshToken', { path: '/api/auth' });

    // Audit log for logout
    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      entity: 'user',
      entityId: userId,
      request: req,
    });

    return { message: 'Logged out' };
  }
}
