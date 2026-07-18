import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IntegrationsService } from "./integrations.service";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequiresPack } from "../../common/decorators/feature-gate.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { fireAlarmSchema, bmsEventSchema } from "@repo/shared";

@ApiTags("integrations")
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  // ──────────────────────────────────────────────────────────────────────────────
  // Incoming Webhooks (Public — no JWT, optional X-Integration-Key)
  // Per D-12: incoming webhooks have no JWT auth. Basic shared-secret check.
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/integrations/fire-alarm
   * Receive fire alarm events from third-party systems.
   * Correlates with nearest camera and creates a CRITICAL alert.
   */
  @Post("fire-alarm")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Réception d'alarme incendie",
    description:
      "Endpoint entrant pour les systèmes d'alarme incendie. " +
      "Le payload est corrélé avec la caméra la plus proche pour capture d'instantané et création d'alerte.",
  })
  async handleFireAlarm(
    @Body(new ZodValidationPipe(fireAlarmSchema)) body: any,
    @Req() req: FastifyRequest,
    @Headers("x-integration-key") integrationKey?: string,
  ) {
    // Validate optional X-Integration-Key
    const orgId = body.siteId;
    if (!(await this.integrationsService.validateIntegrationKey(orgId, "fire_alarm", integrationKey))) {
      return { statusCode: 401, error: "Unauthorized", message: "Clé d'intégration invalide" };
    }

    return this.integrationsService.handleFireAlarm(body);
  }

  /**
   * POST /api/integrations/bms
   * Receive Building Management System events (HVAC, lighting, fire door).
   * Event-based only — no bidirectional control (D-14).
   */
  @Post("bms")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Réception d'événement BMS",
    description:
      "Endpoint entrant pour les systèmes de gestion technique du bâtiment (GTB/BMS). " +
      "Prend en charge les événements HVAC, éclairage de secours et porte coupe-feu. " +
      "Événements uniquement — pas de contrôle bidirectionnel.",
  })
  async handleBmsEvent(
    @Body(new ZodValidationPipe(bmsEventSchema)) body: any,
    @Req() req: FastifyRequest,
    @Headers("x-integration-key") integrationKey?: string,
  ) {
    const orgId = body.siteId;
    if (!(await this.integrationsService.validateIntegrationKey(orgId, "bms", integrationKey))) {
      return { statusCode: 401, error: "Unauthorized", message: "Clé d'intégration invalide" };
    }

    return this.integrationsService.handleBmsEvent(body);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Configuration Endpoints (Authenticated — ADMIN only, BASTION pack required)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/integrations
   * List all configured integrations for the organization.
   */
  @Get()
  @Roles("ADMIN")
  @RequiresPack("BASTION")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lister les intégrations", description: "Liste toutes les intégrations configurées pour l'organisation." })
  async listIntegrations(@Req() req: FastifyRequest) {
    const orgId = (req as any).user?.orgId;
    return this.integrationsService.listIntegrations(orgId);
  }

  /**
   * POST /api/integrations
   * Create or update an integration configuration.
   */
  @Post()
  @Roles("ADMIN")
  @RequiresPack("BASTION")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Configurer une intégration", description: "Crée ou met à jour la configuration d'une intégration tierce." })
  async configureIntegration(
    @Req() req: FastifyRequest,
    @Body() body: { type: string; name: string; config?: Record<string, unknown>; sharedSecret?: string },
  ) {
    const orgId = (req as any).user?.orgId;
    return this.integrationsService.configureIntegration(orgId, body);
  }

  /**
   * DELETE /api/integrations/:id
   * Remove an integration configuration.
   */
  @Delete(":id")
  @Roles("ADMIN")
  @RequiresPack("BASTION")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Supprimer une intégration", description: "Supprime une configuration d'intégration existante." })
  async deleteIntegration(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).user?.orgId;
    return this.integrationsService.deleteIntegration(id, orgId);
  }

  /**
   * GET /api/integrations/:id/events
   * List recent events for a specific integration.
   */
  @Get(":id/events")
  @Roles("ADMIN", "SUPERVISOR")
  @RequiresPack("BASTION")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Événements d'intégration", description: "Liste les événements récents pour une intégration spécifique." })
  async getIntegrationEvents(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const orgId = (req as any).user?.orgId;
    return this.integrationsService.getIntegrationEvents(id, orgId, page, limit);
  }
}
