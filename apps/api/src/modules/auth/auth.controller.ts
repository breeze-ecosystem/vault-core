import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { loginSchema, registerSchema, refreshSchema } from "@repo/shared";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("register")
  async register(@Body(new ZodValidationPipe(registerSchema)) body: any) {
    return this.authService.register(body);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: any,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const result = await this.authService.login(body.email, body.password);

    // Set refresh token as HttpOnly cookie (for web clients)
    res.setCookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken, // Also in body for mobile
      user: result.user,
    };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    // Try body first (mobile), then cookie (web)
    const refreshToken = body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      const validated = refreshSchema.safeParse({ refreshToken: body.refreshToken });
      if (!validated.success) {
        return { error: "Refresh token required" };
      }
    }

    const result = await this.authService.refresh(refreshToken!);

    // Rotate cookie
    res.setCookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const userId = (req as any).user.id;
    const refreshToken = body.refreshToken || req.cookies?.refreshToken;

    await this.authService.logout(userId, refreshToken);

    res.clearCookie("refreshToken", { path: "/api/auth" });

    return { message: "Logged out" };
  }
}
