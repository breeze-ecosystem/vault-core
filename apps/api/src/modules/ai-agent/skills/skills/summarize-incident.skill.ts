import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { Skill } from "../skill.decorator";
import { IncidentAgent } from "../../agents/incident.agent";
import type { AgentContext } from "../../types/agent.types";

@Injectable()
@Skill({
  name: "summarize_incident",
  description:
    "Générer un résumé structuré pour un incident avec chronologie, zones, personnes et recommandations",
  inputSchema: z.object({
    incident_id: z.string().uuid(),
  }),
})
export class SummarizeIncidentSkill {
  private readonly logger = new Logger(SummarizeIncidentSkill.name);

  constructor(private readonly incidentAgent: IncidentAgent) {}

  async execute(
    input: { incident_id: string },
    context: AgentContext,
  ): Promise<unknown> {
    this.logger.log(
      `Executing summarize_incident for incident: ${input.incident_id}`,
    );

    const summary = await this.incidentAgent.generateSummary(
      input.incident_id,
      context,
    );

    return {
      incidentId: input.incident_id,
      summary,
    };
  }
}
