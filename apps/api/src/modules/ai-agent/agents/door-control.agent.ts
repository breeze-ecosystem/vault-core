import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { LlmProviderService } from "../llm/llm-provider.service";
import type { AgentContext } from "../types/agent.types";
import type { Message } from "ollama";
import * as fs from "fs";
import * as path from "path";

export interface CameraAssessment {
  cameraId: string;
  cameraName: string;
  personsDetected: number;
  behavior: "normal" | "suspicious" | "threat";
  behaviorDescription: string;
  doorCondition: "normal" | "damaged" | "forced" | "blocked";
  confidence: number;
  aiAnalysis: string;
}

export interface DoorControlResult {
  doorId: string;
  doorName: string;
  action: string;
  reason: string;
  urgency: string;
  requiresConfirmation: boolean;
  executed: boolean;
}

@Injectable()
export class DoorControlAgent {
  private readonly logger = new Logger(DoorControlAgent.name);
  private readonly systemPrompt: string;
  private readonly aiPreprocessorUrl: string;

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.systemPrompt = this.loadPrompt("door-control.prompt.md");
    this.aiPreprocessorUrl = this.config.get<string>(
      "aiPreprocessorUrl",
      "http://ai-preprocessor:8000",
    );
    this.logger.log("DoorControlAgent initialized");
  }

  /**
   * Assess camera via vision AI (Qwen VL) and AI preprocessor.
   * Follows AiService.callOllama + ai-preprocessor detection pattern.
   */
  async assessCamera(
    cameraId: string,
    context: AgentContext,
  ): Promise<CameraAssessment> {
    try {
      const camera = await this.prisma.camera.findUnique({
        where: { id: cameraId },
        select: { id: true, name: true, lastSnapshotUrl: true },
      });

      if (!camera) {
        return {
          cameraId,
          cameraName: "Inconnue",
          personsDetected: 0,
          behavior: "normal",
          behaviorDescription: "Caméra non trouvée",
          doorCondition: "normal",
          confidence: 0,
          aiAnalysis: "Impossible d'analyser — caméra non trouvée",
        };
      }

      // Try AI preprocessor detection first
      let preprocessorResult: {
        persons: number;
        detections: unknown[];
      } | null = null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(
          `${this.aiPreprocessorUrl}/detect`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cameraId, imageUrl: camera.lastSnapshotUrl }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);

        if (response.ok) {
          preprocessorResult = await response.json();
        }
      } catch (err: unknown) {
        this.logger.warn(
          `AI preprocessor detection failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Vision model analysis via Qwen VL
      let visionAnalysis = "Analyse visuelle non disponible";
      if (camera.lastSnapshotUrl) {
        try {
          const visionMessages: Message[] = [
            { role: "system", content: this.systemPrompt },
            {
              role: "user",
              content: `<user_query>Analyse cette image de la caméra ${camera.name}. Détecte la présence de personnes, évalue le comportement et l'état de la porte.</user_query>`,
            },
          ];

          // Fetch the snapshot as base64
          const imageResponse = await fetch(camera.lastSnapshotUrl);
          if (imageResponse.ok) {
            const buffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            visionAnalysis = await this.llmProvider.chatVision(
              visionMessages,
              base64,
            );
          }
        } catch (err: unknown) {
          this.logger.warn(
            `Vision analysis failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      return {
        cameraId,
        cameraName: camera.name,
        personsDetected: preprocessorResult?.persons || 0,
        behavior: "normal",
        behaviorDescription: visionAnalysis.substring(0, 200),
        doorCondition: "normal",
        confidence: 0.9,
        aiAnalysis: visionAnalysis,
      };
    } catch (err: unknown) {
      this.logger.error(
        `DoorControlAgent.assessCamera failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        cameraId,
        cameraName: "Erreur",
        personsDetected: 0,
        behavior: "normal",
        behaviorDescription: "Erreur d'analyse",
        doorCondition: "normal",
        confidence: 0,
        aiAnalysis: "L'analyse de caméra a échoué.",
      };
    }
  }

  /**
   * Propose door control action — ALWAYS requires confirmation.
   * Guardrail: disabled by default, Orchestrator checks confirmation guard.
   * Per D-28: no automatic execution without confirmation.
   */
  async controlDoor(
    doorId: string,
    action: string,
    context: AgentContext,
  ): Promise<DoorControlResult> {
    try {
      const door = await this.prisma.door.findUnique({
        where: { id: doorId },
        select: { id: true, name: true, zoneId: true },
      });

      if (!door) {
        return {
          doorId,
          doorName: "Inconnue",
          action,
          reason: "Porte non trouvée",
          urgency: "normal",
          requiresConfirmation: true,
          executed: false,
        };
      }

      // Guardrail: propose only, never execute automatically
      const validActions = ["lock", "unlock", "release"];
      if (!validActions.includes(action)) {
        return {
          doorId,
          doorName: door.name,
          action,
          reason: `Action non supportée: ${action}. Actions valides: ${validActions.join(", ")}`,
          urgency: "normal",
          requiresConfirmation: true,
          executed: false,
        };
      }

      this.logger.log(
        `Door control proposed for ${door.name}: ${action} (confirmation required)`,
      );

      return {
        doorId,
        doorName: door.name,
        action,
        reason: `${action} proposé pour la porte ${door.name}`,
        urgency: action === "lock" ? "high" : "normal",
        requiresConfirmation: true,
        executed: false, // Never auto-execute — guardrail in Plan 05
      };
    } catch (err: unknown) {
      this.logger.error(
        `DoorControlAgent.controlDoor failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        doorId,
        doorName: "Erreur",
        action,
        reason: "Erreur lors du contrôle de porte",
        urgency: "normal",
        requiresConfirmation: true,
        executed: false,
      };
    }
  }

  private loadPrompt(filename: string): string {
    try {
      const promptPath = path.resolve(__dirname, "..", "prompts", filename);
      return fs.readFileSync(promptPath, "utf-8");
    } catch {
      this.logger.warn(`Could not load prompt: ${filename}`);
      return "";
    }
  }
}
