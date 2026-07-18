import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  Body,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ForensicService } from "./forensic.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequiresPack } from "../../common/decorators/feature-gate.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import { forensicEvidenceSchema } from "@repo/shared";
import * as fs from "fs";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("forensic")
@Controller("forensic")
@RequiresPack("BASTION")
export class ForensicController {
  constructor(
    private readonly forensicService: ForensicService,
    @InjectQueue("forensic-certification") private readonly forensicQueue: Queue,
  ) {}

  /**
   * Certify evidence for an event.
   * Enqueues a BullMQ job that runs async.
   */
  @Post("certify")
  @Roles("ADMIN", "SUPER_ADMIN")
  @Audited({ action: "forensic.certify", entity: "ForensicEvidence" })
  @ApiOperation({ summary: "Certifier une preuve judiciaire", description: "Envoie une demande de certification de preuve avec horodatage TSA (RFC 3161). Le traitement est asynchrone via BullMQ." })
  @ApiBearerAuth()
  async certify(
    @Body(new ZodValidationPipe(forensicEvidenceSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).organizationId;
    const job = await this.forensicQueue.add("certify", {
      eventId: body.eventId,
      mediaType: body.mediaType,
      orgId,
    });

    return { jobId: job.id, status: "processing" };
  }

  /**
   * Get evidence metadata by ID.
   */
  @Get("evidence/:id")
  @Roles("ADMIN", "SUPERVISOR")
  @ApiOperation({ summary: "Obtenir une preuve", description: "Retourne les métadonnées d'une preuve judiciaire certifiée." })
  @ApiBearerAuth()
  async getEvidence(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).organizationId;
    return this.forensicService.getEvidence(orgId, id);
  }

  /**
   * Download certified evidence ZIP.
   */
  @Get("evidence/:id/download")
  @Roles("ADMIN", "SUPERVISOR")
  @ApiOperation({ summary: "Télécharger une preuve", description: "Télécharge le fichier ZIP contenant la preuve judiciaire certifiée avec son certificat TSA." })
  @ApiBearerAuth()
  async downloadEvidence(
    @Param("id") id: string,
    @Res() reply: FastifyReply,
    @Req() req: FastifyRequest,
  ) {
    const orgId = (req as any).organizationId;
    const evidence = await this.forensicService.getEvidence(orgId, id);
    const zipPath = this.forensicService.getEvidenceZipPath(orgId, evidence);

    // Check file existence before streaming
    if (!fs.existsSync(zipPath)) {
      return reply.status(404).send({ error: "Fichier de preuve introuvable" });
    }

    const stream = fs.createReadStream(zipPath);
    reply.header("Content-Type", "application/zip");
    reply.header(
      "Content-Disposition",
      `attachment; filename="evidence-${id.substring(0, 8)}.zip"`,
    );
    reply.header("Content-Length", fs.statSync(zipPath).size);
    return reply.send(stream);
  }

  /**
   * List evidence (paginated).
   */
  @Get("evidence")
  @Roles("ADMIN", "SUPERVISOR")
  @ApiOperation({ summary: "Lister les preuves", description: "Liste toutes les preuves judiciaires certifiées pour l'organisation, avec pagination." })
  @ApiBearerAuth()
  async listEvidence(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: FastifyRequest,
  ) {
    const orgId = (req as any)?.organizationId ?? "";
    return this.forensicService.listEvidence(
      orgId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
