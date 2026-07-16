import { Injectable, Logger, Inject } from "@nestjs/common";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import type { AgentChatMessage } from "../types/agent.types";

const CONVERSATION_TTL_SECONDS = 7776000; // 90 days per D-34
const CONVERSATION_KEY_PREFIX = "agent:conv";

@Injectable()
export class ConversationMemory {
  private readonly logger = new Logger(ConversationMemory.name);

  constructor(@Inject("REDIS_AGENT") private readonly redis: Redis) {}

  /**
   * Create a new conversation session and return the session ID.
   */
  async createSession(organizationId: string): Promise<string> {
    const sessionId = uuidv4();
    this.logger.log(
      `Created session ${sessionId} for org ${organizationId}`,
    );
    return sessionId;
  }

  /**
   * Save a message to the conversation history.
   * Stored in Redis list with key pattern `agent:conv:{organizationId}:{sessionId}`.
   * TTL of 90 days applied per D-34.
   */
  async saveMessage(
    sessionId: string,
    organizationId: string,
    message: AgentChatMessage,
  ): Promise<void> {
    const key = this.buildKey(organizationId, sessionId);
    const serialized = JSON.stringify({
      ...message,
      timestamp: message.timestamp ?? new Date().toISOString(),
    });

    await this.redis.rpush(key, serialized);
    await this.redis.expire(key, CONVERSATION_TTL_SECONDS);
  }

  /**
   * Retrieve conversation history for a session.
   * Returns the last `maxTurns` messages (default 20).
   */
  async getHistory(
    sessionId: string,
    organizationId: string,
    maxTurns = 20,
  ): Promise<AgentChatMessage[]> {
    const key = this.buildKey(organizationId, sessionId);
    const items = await this.redis.lrange(key, -maxTurns, -1);

    return items.map((item) => {
      try {
        return JSON.parse(item) as AgentChatMessage;
      } catch {
        this.logger.warn(`Failed to parse conversation message: ${item.substring(0, 50)}`);
        return null;
      }
    }).filter((m): m is AgentChatMessage => m !== null);
  }

  /**
   * Store semantic memory (conversation summary + embedding).
   *
   * NOTE: Qdrant wiring is deferred to Plan 06.
   * When Qdrant is available, this will store embeddings via @qdrant/js-client-rest
   * into the agent_memory collection keyed by organizationId.
   *
   * For now, we store summaries alongside the conversation in Redis as a sidecar key
   * to keep the API stable for callers (OrchestratorService).
   */
  async saveSemanticMemory(
    organizationId: string,
    sessionId: string,
    conversationSummary: string,
    embedding?: number[],
  ): Promise<void> {
    const memoryKey = `${this.buildKey(organizationId, sessionId)}:memory`;
    const payload = {
      summary: conversationSummary,
      embedding: embedding ?? null,
      storedAt: new Date().toISOString(),
    };

    await this.redis.set(memoryKey, JSON.stringify(payload));
    await this.redis.expire(memoryKey, CONVERSATION_TTL_SECONDS);

    this.logger.log(
      `Saved semantic memory for session ${sessionId} (embedding: ${embedding ? `${embedding.length}d` : "none"})`,
    );

    // TODO (Plan 06): Wire Qdrant client
    // const qdrantClient = new QdrantClient({ url: config.qdrantUrl });
    // await qdrantClient.upsert("agent_memory", {
    //   points: [{ id: sessionId, vector: embedding, payload: { organizationId, summary: conversationSummary } }],
    // });
  }

  /**
   * Purge expired conversations for an organization.
   * Called by cron or on-demand. Redis TTL handles expiry automatically,
   * but this provides an explicit cleanup path.
   */
  async purgeExpired(organizationId: string): Promise<number> {
    const pattern = `${CONVERSATION_KEY_PREFIX}:${organizationId}:*`;
    const keys = await this.redis.keys(pattern);
    let purged = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      // Keys with TTL <= 0 are expired or non-existent
      if (ttl <= 0) {
        await this.redis.del(key);
        purged++;
      }
    }

    if (purged > 0) {
      this.logger.log(
        `Purged ${purged} expired conversation keys for org ${organizationId}`,
      );
    }

    return purged;
  }

  /**
   * Build the Redis key for a conversation.
   * Pattern: agent:conv:{organizationId}:{sessionId}
   */
  private buildKey(organizationId: string, sessionId: string): string {
    return `${CONVERSATION_KEY_PREFIX}:${organizationId}:${sessionId}`;
  }
}
