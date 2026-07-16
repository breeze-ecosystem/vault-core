import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import type { Tool, Message, ChatResponse } from "ollama";

export interface ToolExecutor {
  executeTool(name: string, input: Record<string, unknown>): Promise<unknown>;
}

@Injectable()
export class LlmProviderService {
  private readonly logger = new Logger(LlmProviderService.name);
  private readonly ollama: Ollama;
  private readonly ollamaUrl: string;
  private readonly llamaModel: string;
  private readonly qwenVlModel: string;
  private readonly embeddingModel: string;

  constructor(private readonly config: ConfigService) {
    this.ollamaUrl = this.config.get<string>(
      "ollamaBaseUrl",
      "http://localhost:11434",
    );
    this.ollama = new Ollama({ host: this.ollamaUrl });
    this.llamaModel = this.config.get<string>("ai.llamaModel", "llama3.1");
    this.qwenVlModel = this.config.get<string>(
      "ai.qwenVlModel",
      "qwen-vl",
    );
    this.embeddingModel = this.config.get<string>(
      "ai.embeddingModel",
      "nomic-embed-text",
    );
  }

  // ── chat() — basic chat completion ──

  async chat(
    messages: Message[],
    tools?: Tool[],
    options?: Record<string, unknown>,
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await this.ollama.chat({
        model: this.llamaModel,
        messages,
        tools: tools as Tool[] | undefined,
        options: { temperature: 0.1, ...options },
      });

      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.error(`Ollama chat failed: ${message}`);
      throw new Error(`Ollama chat failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── chatWithTools() — ReAct tool-calling loop ──

  async chatWithTools(
    messages: Message[],
    tools: Tool[],
    toolExecutor: ToolExecutor,
    maxIterations = 5,
  ): Promise<string> {
    const conversation = [...messages];
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;
      this.logger.debug(`Tool-calling iteration ${iterations}/${maxIterations}`);

      let response: ChatResponse;
      try {
        response = await this.chat(conversation, tools);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);
        this.logger.error(`chatWithTools iteration ${iterations} failed: ${message}`);
        throw err;
      }

      const assistantMessage = response.message;
      conversation.push(assistantMessage);

      // No tool calls — return final content
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return assistantMessage.content;
      }

      // Execute each tool call and feed results back
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolInput: Record<string, unknown> = {};

        try {
          toolInput =
            typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
        } catch {
          toolInput = {};
        }

        this.logger.log(
          `Executing tool: ${toolName} with input: ${JSON.stringify(toolInput)}`,
        );

        let toolResult: unknown;
        try {
          toolResult = await toolExecutor.executeTool(toolName, toolInput);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : String(err);
          this.logger.warn(`Tool ${toolName} execution failed: ${message}`);
          toolResult = { error: message };
        }

        // Feed tool result back into conversation
        conversation.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          tool_name: toolName,
        } as Message);
      }
    }

    // Max iterations reached — return whatever the last assistant message said
    const lastAssistant = [...conversation]
      .reverse()
      .find((m) => m.role === "assistant");
    return lastAssistant?.content ?? "Maximum d'itérations atteint sans réponse finale.";
  }

  // ── chatVision() — vision model for camera analysis ──

  async chatVision(messages: Message[], imageBase64: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const visionMessages: Message[] = messages.map((m) => ({ ...m }));
      // Attach image to the last user message or create one
      const lastUserMsg = [...visionMessages]
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMsg) {
        lastUserMsg.images = [imageBase64];
      }

      const response = await this.ollama.chat({
        model: this.qwenVlModel,
        messages: visionMessages,
        options: { temperature: 0.1 },
      });

      return response.message.content;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.error(`Ollama chatVision failed: ${message}`);
      throw new Error(`Ollama chatVision failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── embed() — generate embeddings ──

  async embed(text: string, model?: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await this.ollama.embed({
        model: model || this.embeddingModel,
        input: text,
      });

      // ollama npm package returns embed() with { embeddings: number[][] }
      return response.embeddings?.[0] ?? [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.error(`Ollama embed failed: ${message}`);
      throw new Error(`Ollama embed failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── streamChat() — token-by-token streaming for SSE ──

  async *streamChat(
    messages: Message[],
    tools?: Tool[],
  ): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await this.ollama.chat({
        model: this.llamaModel,
        messages,
        tools: tools as Tool[] | undefined,
        stream: true,
        options: { temperature: 0.1 },
      });

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          yield chunk.message.content;
        }
        if (chunk.done) break;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.error(`Ollama streamChat failed: ${message}`);
      throw new Error(`Ollama streamChat failed: ${message}`);
    }
  }

  // ── status check ──

  async checkStatus(): Promise<{
    ollamaConnected: boolean;
    model: string;
    embeddingModel: string;
  }> {
    try {
      const response = await this.ollama.chat({
        model: this.llamaModel,
        messages: [{ role: "user", content: "ping" }],
        options: { temperature: 0 },
      });

      return {
        ollamaConnected: Boolean(response.message),
        model: this.llamaModel,
        embeddingModel: this.embeddingModel,
      };
    } catch {
      return {
        ollamaConnected: false,
        model: this.llamaModel,
        embeddingModel: this.embeddingModel,
      };
    }
  }
}
