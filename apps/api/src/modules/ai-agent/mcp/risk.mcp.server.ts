import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  McpServer,
  type ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { SkillRegistry } from "../skills/skill-registry.service";
import type { AgentContext } from "../types/agent.types";

/**
 * RiskMcpServer exposes risk-related tools via the MCP protocol.
 *
 * Tools:
 * - get_risk_score: Obtenir le score de risque pour une zone avec explication
 *
 * Skills are the source of truth for tool definitions per D-04;
 * MCP servers wrap them in the MCP protocol for external discoverability.
 */
@Injectable()
export class RiskMcpServer implements OnModuleInit {
  private readonly logger = new Logger(RiskMcpServer.name);
  readonly server: McpServer;

  constructor(private readonly skillRegistry: SkillRegistry) {
    this.server = new McpServer({
      name: "risk-mcp",
      version: "1.0.0",
    });
  }

  onModuleInit(): void {
    const skill = this.skillRegistry.getSkill("get_risk_score");

    if (!skill) {
      this.logger.warn("get_risk_score skill not registered — skipping MCP tool");
      return;
    }

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
        "get_risk_score",
        skill.definition.description,
        skill.definition.inputSchema,
        handler,
      );
      this.logger.log("Registered MCP tool: get_risk_score");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to register MCP tool get_risk_score: ${message}`);
    }
  }
}
