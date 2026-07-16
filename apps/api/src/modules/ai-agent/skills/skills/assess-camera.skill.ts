import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { Skill } from "../skill.decorator";
import { DoorControlAgent } from "../../agents/door-control.agent";
import type { AgentContext } from "../../types/agent.types";

@Injectable()
@Skill({
  name: "assess_camera",
  description:
    "Analyser une caméra avec vision AI — détection de personnes, comportement, état de porte",
  inputSchema: z.object({
    camera_id: z.string().uuid(),
    query: z.string().optional(),
  }),
})
export class AssessCameraSkill {
  private readonly logger = new Logger(AssessCameraSkill.name);

  constructor(private readonly doorControlAgent: DoorControlAgent) {}

  async execute(
    input: { camera_id: string; query?: string },
    context: AgentContext,
  ): Promise<unknown> {
    this.logger.log(
      `Executing assess_camera for camera: ${input.camera_id}`,
    );

    const assessment = await this.doorControlAgent.assessCamera(
      input.camera_id,
      context,
    );

    return {
      cameraId: input.camera_id,
      assessment,
      query: input.query || "Analyse générale",
    };
  }
}
