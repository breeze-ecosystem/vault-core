import { Controller, Post, Body, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { FaceService } from "./face.service";
import { Roles } from "../../../common/decorators/roles.decorator";
import { RequiresModule } from "../../../common/decorators/feature-gate.decorator";

/**
 * Sub-controller for face-specific internal operations (embedding, search).
 * Face CRUD is handled by the main BastionController.
 */
@Controller("bastion/face")
export class FaceController {
  constructor(private faceService: FaceService) {}

  @Post("search")
  @Roles("ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async searchMatches(
    @Body() body: { photoBase64: string; organizationId: string; limit?: number },
  ) {
    return this.faceService.searchMatches(body.photoBase64, body.organizationId, body.limit ?? 5);
  }
}
