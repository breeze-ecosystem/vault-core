import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  McpServer,
  type ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { SkillRegistry } from "../skills/skill-registry.service";
import type { AgentContext } from "../types/agent.types";

/**
 * CamerasMcpServer exposes camera-related tools via the MCP protocol.
 *
 * Tools:
 * - assess_camera: Analyser une caméra avec vision AI — détection de personnes,
 *   comportement, état de porte (cross-registered from assess-camera.skill)
 *
 * Skills are the source of truth for tool definitions per D-04;
 * MCP servers wrap them in the MCP protocol for external discoverability.
 */
@Injectable()
export class CamerasMcpServer implements OnModuleInit {
  private readonly logger = new Logger(CamerasMcpServer.name);
  readonly server: McpServer;

  constructor(private readonly skillRegistry: SkillRegistry) {
    this.server = new McpServer({
      name: "cameras-mcp",
      version: "1.0.0",
    });
  }

  onModuleInit(): void {
    const skill = this.skillRegistry.getSkill("assess_camera");

    if (!skill) {
      this.logger.warn("assess_camera skill not registered — skipping MCP tool");
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
        "assess_camera",
        skill.definition.description,
        skill.definition.inputSchema,
        handler,
      );
      this.logger.log("Registered MCP tool: assess_camera");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to register MCP tool assess_camera: ${message}`);
    }

    this.logger.log("Registered MCP tool: assess_camera (cameras)");
  }
}
