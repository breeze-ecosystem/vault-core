import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { Skill } from "../skill.decorator";
import { EventSearchAgent } from "../../agents/event-search.agent";
import type { AgentContext } from "../../types/agent.types";

@Injectable()
@Skill({
  name: "search_events",
  description:
    "Rechercher des événements de sécurité avec filtres (type, zone, porte, véhicule, période)",
  inputSchema: z.object({
    query: z.string().optional(),
    event_types: z.array(z.string()).optional(),
    zone: z.string().optional(),
    door_id: z.string().optional(),
    from_time: z.string().optional(),
    to_time: z.string().optional(),
    limit: z.number().optional().default(50),
  }),
})
export class SearchEventsSkill {
  private readonly logger = new Logger(SearchEventsSkill.name);

  constructor(private readonly eventSearchAgent: EventSearchAgent) {}

  async execute(input: {
    query?: string;
    event_types?: string[];
    zone?: string;
    door_id?: string;
    from_time?: string;
    to_time?: string;
    limit?: number;
  }, context: AgentContext): Promise<unknown> {
    this.logger.log(
      `Executing search_events: "${input.query?.substring(0, 50) || "tous"}"`,
    );

    const results = await this.eventSearchAgent.search(
      input.query || "tous les événements récents",
      context,
    );

    return {
      count: results.results.length,
      events: results.results,
      summary: results.summary,
    };
  }
}
