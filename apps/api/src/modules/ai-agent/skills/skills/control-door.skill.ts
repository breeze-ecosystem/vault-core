import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { Skill } from "../skill.decorator";
import { DoorControlAgent } from "../../agents/door-control.agent";
import type { AgentContext } from "../../types/agent.types";

@Injectable()
@Skill({
  name: "control_door",
  description:
    "Contrôler une porte (verrouiller/déverrouiller/libérer) — nécessite confirmation opérateur",
  inputSchema: z.object({
    door_id: z.string().uuid(),
    action: z.enum(["lock", "unlock", "release"]),
  }),
})
export class ControlDoorSkill {
  private readonly logger = new Logger(ControlDoorSkill.name);

  constructor(private readonly doorControlAgent: DoorControlAgent) {}

  async execute(
    input: { door_id: string; action: "lock" | "unlock" | "release" },
    context: AgentContext,
  ): Promise<unknown> {
    this.logger.log(
      `Executing control_door: ${input.action} for ${input.door_id}`,
    );

    // DISABLED by default — requires operator confirmation
    // Guardrail: never auto-execute, always mark requiresConfirmation: true
    const result = await this.doorControlAgent.controlDoor(
      input.door_id,
      input.action,
      context,
    );

    return {
      doorId: input.door_id,
      proposedAction: input.action,
      requiresConfirmation: result.requiresConfirmation,
      reason: result.reason,
      warning: result.requiresConfirmation
        ? "⚠️ Cette action nécessite une confirmation explicite de l'opérateur avant exécution."
        : undefined,
    };
  }
}
