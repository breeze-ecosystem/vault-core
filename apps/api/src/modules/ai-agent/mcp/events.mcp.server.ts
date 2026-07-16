import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  McpServer,
  type ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { SkillRegistry } from "../skills/skill-registry.service";
import type { AgentContext } from "../types/agent.types";

/**
 * EventsMcpServer exposes event-related tools via the MCP protocol.
 *
 * Tools:
 * - search_events: Rechercher des événements de sécurité avec filtres
 *
 * Skills are the source of truth for tool definitions per D-04;
 * MCP servers wrap them in the MCP protocol for external discoverability.
 */
@Injectable()
export class EventsMcpServer implements OnModuleInit {
  private readonly logger = new Logger(EventsMcpServer.name);
  readonly server: McpServer;

  constructor(private readonly skillRegistry: SkillRegistry) {
    this.server = new McpServer({
      name: "events-mcp",
      version: "1.0.0",
    });
  }

  onModuleInit(): void {
    const skill = this.skillRegistry.getSkill("search_events");

    if (!skill) {
      this.logger.warn("search_events skill not registered — skipping MCP tool");
      return;
    }

    // Use tool() with description+paramsSchema+callback overload per
    // RESEARCH.md MCP pattern. The callback cast avoids deep type inference
    // from Zod schemas causing TS2589.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler: ToolCallback<any> = async (args) => {
      const context: AgentContext = {
        userId: "mcp",
        organizationId: "mcp",
        role: "ADMIN",
      };

      try {
        const instance = skill.instance as {
          execute: (a: unknown, ctx: AgentContext) => Promise<unknown>;
        };
        const result = await instance.execute(args, context);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Erreur: ${message}` }] };
      }
    };

    try {
      this.server.tool(
        "search_events",
        skill.definition.description,
        skill.definition.inputSchema,
        handler,
      );
      this.logger.log("Registered MCP tool: search_events");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to register MCP tool search_events: ${message}`);
    }
  }
}
