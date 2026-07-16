import { Injectable, Logger } from "@nestjs/common";
import { LlmProviderService } from "../llm/llm-provider.service";
import type { AgentChatMessage } from "../types/agent.types";

const DEFAULT_COMPRESSION_THRESHOLD = 16000; // ~16K tokens per D-10
const CHARS_PER_TOKEN_ESTIMATE = 4;

const COMPRESSION_SYSTEM_PROMPT = `Tu es un assistant de compression de contexte conversationnel.
Résume la conversation suivante en un paragraphe structuré qui capture:
1. Les sujets principaux abordés
2. Les décisions ou conclusions prises
3. Les actions effectuées ou demandées
4. Le contexte important pour la suite

Le résumé doit être concis mais complet, en français.
Ne réponds qu'avec le résumé, sans introduction ni commentaire supplémentaire.`;

export interface CompressionResult {
  compressedContext: string;
  recentMessages: AgentChatMessage[];
}

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name);

  constructor(private readonly llmProvider: LlmProviderService) {}

  /**
   * Compress conversation history when it exceeds the token threshold.
   *
   * Strategy per D-10:
   * 1. Estimate tokens in the full conversation
   * 2. If below threshold, return as-is
   * 3. If above threshold, keep the last N messages (staying under threshold),
   *    summarize the earlier messages via LLM, and return both
   */
  async compress(
    messages: AgentChatMessage[],
    threshold: number = DEFAULT_COMPRESSION_THRESHOLD,
  ): Promise<CompressionResult | null> {
    const totalText = messages.map((m) => m.content).join(" ");
    const estimatedTokens = this.estimateTokens(totalText);

    if (estimatedTokens <= threshold) {
      // Below threshold — no compression needed
      return null;
    }

    this.logger.log(
      `Compressing conversation: ${estimatedTokens} tokens (threshold: ${threshold})`,
    );

    // Split: keep recent messages, summarize earlier ones
    const { earlierMessages, recentMessages } =
      this.splitConversation(messages, threshold);

    if (earlierMessages.length === 0) {
      // Even the most recent messages fill the window — compress the middle
      return null;
    }

    const earlierText = earlierMessages
      .map(
        (m) =>
          `${m.role.toUpperCase()}: ${m.content}`,
      )
      .join("\n");

    try {
      const summaryResponse = await this.llmProvider.chat([
        { role: "system", content: COMPRESSION_SYSTEM_PROMPT },
        { role: "user", content: `Résume cette conversation:\n\n${earlierText}` },
      ]);

      const compressedContext = summaryResponse.message?.content ?? "";

      this.logger.log(
        `Compressed ${earlierMessages.length} messages into ${this.estimateTokens(compressedContext)} tokens`,
      );

      return { compressedContext, recentMessages };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.warn(`Compression summarization failed: ${message}`);

      // Degrade gracefully: keep all recent messages, drop summary
      return {
        compressedContext:
          "[Contexte antérieur non compressé — résumé indisponible]",
        recentMessages,
      };
    }
  }

  /**
   * Rough token estimation heuristic: Math.ceil(text.length / 4).
   * Used to decide when compression is needed.
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
  }

  /**
   * Split conversation into "earlier" (to summarize) and "recent" (to keep).
   * Walks backward from the most recent messages, keeping them as long as
   * they stay under half the threshold.
   */
  private splitConversation(
    messages: AgentChatMessage[],
    threshold: number,
  ): {
    earlierMessages: AgentChatMessage[];
    recentMessages: AgentChatMessage[];
  } {
    const recent: AgentChatMessage[] = [];
    let recentTokens = 0;

    // Walk backward — keep recent messages within budget
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens(messages[i].content);
      if (recentTokens + msgTokens > threshold / 2) {
        // Stop — this message and earlier go to the summary pile
        const earlierMessages = messages.slice(0, i + 1);
        return { earlierMessages, recentMessages: recent.reverse() };
      }
      recentTokens += msgTokens;
      recent.push(messages[i]);
    }

    // All messages fit in the recent window
    return { earlierMessages: [], recentMessages: recent.reverse() };
  }
}
