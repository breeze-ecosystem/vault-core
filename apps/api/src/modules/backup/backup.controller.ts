import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { BackupService } from "./backup.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequiresPack } from "../../common/decorators/feature-gate.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import { backupConfigSchema } from "@repo/shared";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("backup")
@Controller("backup")
@RequiresPack("BASTION")
@Roles("ADMIN")
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * Get backup configuration for the current organization.
   */
  @Get("config")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Configuration sauvegarde", description: "Récupère la configuration de sauvegarde NAS pour l'organisation." })
  async getConfig(@Req() req: FastifyRequest) {
    const orgId = (req as any).organizationId;
    return this.backupService.getConfig(orgId);
  }

  /**
   * Save or update backup configuration.
   */
  @Post("config")
  @Audited({ action: "backup.save-config", entity: "BackupConfig" })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sauvegarder configuration", description: "Crée ou met à jour la configuration de sauvegarde NAS." })
  async saveConfig(
    @Body(new ZodValidationPipe(backupConfigSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).organizationId;
    return this.backupService.saveConfig(orgId, body);
  }

  /**
   * Test NAS connection without saving configuration.
   */
  @Post("test")
  @ApiOperation({ summary: "Tester connexion NAS", description: "Teste la connexion au NAS sans sauvegarder la configuration." })
  async testConnection(
    @Body() body: { targetPath: string; username?: string; password?: string },
  ) {
    return this.backupService.testConnection(body);
  }

  /**
   * Trigger a manual backup.
   */
  @Post("run")
  @Audited({ action: "backup.manual-run", entity: "BackupJob" })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lancer sauvegarde manuelle", description: "Déclenche une sauvegarde manuelle immédiate." })
  async runManualBackup(@Req() req: FastifyRequest) {
    const orgId = (req as any).organizationId;
    return this.backupService.runManualBackup(orgId);
  }

  /**
   * List backup job history (paginated).
   */
  @Get("jobs")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Historique sauvegardes", description: "Liste l'historique des travaux de sauvegarde avec pagination." })
  async listJobs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: FastifyRequest,
  ) {
    const orgId = (req as any)?.organizationId ?? "";
    return this.backupService.listJobs(
      orgId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
