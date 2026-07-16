import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const FALLBACK_RESPONSE_FRENCH =
  "IA temporairement indisponible. Le service d'intelligence artificielle ne répond pas. " +
  "Vos opérations de sécurité (portes, alertes, caméras) restent fonctionnelles. " +
  "Veuillez réessayer dans quelques instants ou contacter le support technique si le problème persiste.";

const HEALTH_CHECK_TIMEOUT_MS = 5000;

export interface DegradationStatus {
  ollamaAvailable: boolean;
  models: string[];
  degraded: boolean;
}

/**
 * DegradationService provides graceful fallback when AI models are unavailable.
 *
 * Per D-33:
 * - checkHealth(): HTTP health check to Ollama at /api/tags with 5s timeout
 * - getFallbackResponse(): Returns the standardized French fallback message
 * - isDegraded(): Returns degradation status — called by LLM provider before
 *   each call to avoid attempting LLM calls when models are unreachable
 *
 * Follows AiService.checkStatus() pattern: fetch-based health check with timeout,
 * return structured status object on success or catch-all on failure.
 */
@Injectable()
export class DegradationService {
  private readonly logger = new Logger(DegradationService.name);
  private readonly ollamaBaseUrl: string;
  private degraded = false;
  private lastCheckTime = 0;
  private cachedModels: string[] = [];

  // Minimum interval between health checks (10s) to avoid hammering Ollama
  private static readonly HEALTH_CHECK_COOLDOWN_MS = 10000;

  constructor(private readonly config: ConfigService) {
    this.ollamaBaseUrl = this.config.get<string>(
      "ollamaBaseUrl",
      "http://localhost:11434",
    );
  }

  /**
   * Check if the AI models are available by probing Ollama's /api/tags endpoint.
   *
   * Results are cached for HEALTH_CHECK_COOLDOWN_MS to avoid repeated calls.
   * Returns structured DegradationStatus.
   */
  async checkHealth(): Promise<DegradationStatus> {
    const now = Date.now();
    if (now - this.lastCheckTime < DegradationService.HEALTH_CHECK_COOLDOWN_MS) {
      return {
        ollamaAvailable: !this.degraded,
        models: this.cachedModels,
        degraded: this.degraded,
      };
    }

    this.lastCheckTime = now;

    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(
          `Ollama health check returned ${response.status}`,
        );
        this.degraded = true;
        this.cachedModels = [];
        return { ollamaAvailable: false, models: [], degraded: true };
      }

      const data = (await response.json()) as {
        models?: { name: string }[];
      };
      const models = (data.models ?? []).map((m) => m.name);
      this.cachedModels = models;
      this.degraded = false;

      this.logger.debug(
        `Ollama healthy — ${models.length} models available`,
      );

      return { ollamaAvailable: true, models, degraded: false };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.warn(`Ollama health check failed: ${message}`);
      this.degraded = true;
      this.cachedModels = [];
      return { ollamaAvailable: false, models: [], degraded: true };
    }
  }

  /**
   * Return the standardized French fallback response for model unavailability.
   * Called when the system is in degraded mode.
   */
  getFallbackResponse(_context?: string): string {
    return FALLBACK_RESPONSE_FRENCH;
  }

  /**
   * Quick check: is the system currently degraded?
   * Called by OrchestratorService / LlmProviderService before each LLM call.
   *
   * Returns the cached status from the last checkHealth() call, or performs
   * a fresh check if the cache is stale.
   */
  async isDegraded(): Promise<boolean> {
    const now = Date.now();
    if (
      now - this.lastCheckTime <
      DegradationService.HEALTH_CHECK_COOLDOWN_MS
    ) {
      return this.degraded;
    }

    const status = await this.checkHealth();
    return status.degraded;
  }

  /**
   * Force a health check, bypassing the cooldown cache.
   * Useful for admin diagnostics endpoints.
   */
  async forceCheck(): Promise<DegradationStatus> {
    this.lastCheckTime = 0; // reset cooldown
    return this.checkHealth();
  }
}
