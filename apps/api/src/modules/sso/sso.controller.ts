import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  Res,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SsoService } from "./sso.service";
import { AuthService } from "../auth/auth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Public } from "../../common/decorators/public.decorator";
import { RequiresFeature } from "../../common/decorators/feature-gate.decorator";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("auth")
@Controller("auth/sso")
export class SsoController {
  constructor(
    private ssoService: SsoService,
    private authService: AuthService,
  ) {}

  // ─── SAML Routes ──────────────────────────────────────────────────

  @Public()
  @Get("saml/login")
  @RequiresFeature("sso")
  @UseGuards(AuthGuard("saml"))
  @ApiOperation({ summary: "Initiate SAML SSO login — redirects to IdP" })
  async samlLogin() {
    // Passport handles the redirect to IdP
    // This route is a trigger — AuthGuard("saml") redirects automatically
    return { message: "Redirecting to SAML IdP..." };
  }

  @Public()
  @Post("saml/callback")
  @RequiresFeature("sso")
  @UseGuards(AuthGuard("saml"))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "SAML callback — validates assertion and issues JWT" })
  async samlCallback(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const user = (req as any).user;
    const result = await this.authService.exchangeSsoUser(user);

    res.setCookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        orgId: user.orgId,
        role: user.role,
      },
    };
  }

  // ─── OIDC Routes ──────────────────────────────────────────────────

  @Public()
  @Get("oidc/login")
  @RequiresFeature("sso")
  @UseGuards(AuthGuard("oidc"))
  @ApiOperation({ summary: "Initiate OIDC SSO login — redirects to IdP" })
  async oidcLogin() {
    return { message: "Redirecting to OIDC IdP..." };
  }

  @Public()
  @Get("oidc/callback")
  @RequiresFeature("sso")
  @UseGuards(AuthGuard("oidc"))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "OIDC callback — validates tokenset and issues JWT" })
  async oidcCallback(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const user = (req as any).user;
    const result = await this.authService.exchangeSsoUser(user);

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
      user: {
        id: user.id,
        email: user.email,
        orgId: user.orgId,
        role: user.role,
      },
    };
  }

  // ─── IdP Config CRUD (ADMIN only) ───────────────────────────────

  @Get("config")
  @Roles("ADMIN")
  @RequiresFeature("sso")
  @ApiOperation({ summary: "Get current organization's IdP configuration" })
  async getConfig(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    if (!orgId) {
      return { configured: false };
    }

    const config = await this.ssoService.getConfig(orgId);
    if (!config) {
      return { configured: false };
    }

    // Never return clientSecret in response (T-10-09)
    return {
      configured: true,
      protocol: config.protocol,
      metadataUrl: config.metadataUrl,
      entityId: config.entityId,
      certificate: config.certificate ? "••••••••" : null,
      attributeMappings: config.attributeMappings,
      isActive: config.isActive,
      ssoEnforced: config.ssoEnforced,
      clientId: config.clientId,
      issuerUrl: config.issuerUrl,
      entryPoint: config.entryPoint,
    };
  }

  @Post("config")
  @Roles("ADMIN")
  @RequiresFeature("sso")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Create or update IdP configuration" })
  async upsertConfig(
    @Req() req: FastifyRequest,
    @Body() body: any,
  ) {
    const orgId = (req as any).user?.orgId;
    if (!orgId) {
      return { error: "Organization context required" };
    }

    const result = await this.ssoService.createOrUpdateConfig(orgId, body);
    return {
      success: true,
      protocol: result.protocol,
      isActive: result.isActive,
    };
  }

  @Delete("config")
  @Roles("ADMIN")
  @RequiresFeature("sso")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate IdP configuration" })
  async deactivateConfig(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    if (!orgId) {
      return { error: "Organization context required" };
    }

    await this.ssoService.createOrUpdateConfig(orgId, {
      protocol: "saml",
      isActive: false,
    });

    return { success: true, message: "SSO configuration deactivated" };
  }
}
