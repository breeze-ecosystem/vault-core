"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { AgentThinkingIndicator } from "@/components/agent-thinking-indicator";
import { SSEStatusBanner } from "@/components/sse-status-banner";
import { ProactiveNotification } from "@/components/proactive-notification";
import { QuickActions } from "@/components/quick-actions";
import { createAgentChatStream } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  tokens: string[];
  isStreaming: boolean;
  toolCalls?: Array<{
    type: string;
    name?: string;
    input?: unknown;
    output?: unknown;
  }>;
  timestamp: string;
  isProactive?: boolean;
  proactiveEvent?: {
    eventType: string;
    zone: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  };
}

interface ChatPanelProps {
  sessionId: string;
  onActionConfirm?: (action: string, params: unknown) => void;
  className?: string;
}

const SUGGESTED_QUERIES = [
  "Voir les alertes",
  "Caméras actives",
  "État des portes",
  "Résumé de la situation",
];

export function ChatPanel({
  sessionId,
  onActionConfirm,
  className,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sseStatus, setSseStatus] = useState<
    "connected" | "reconnecting" | "disconnected"
  >("connected");
  const [thinkingAgent, setThinkingAgent] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg: AgentMessage) => {
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const updateLastMessage = (updater: (msg: AgentMessage) => AgentMessage) => {
    setMessages((prev) => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      if (lastIdx >= 0) {
        copy[lastIdx] = updater(copy[lastIdx]!);
      }
      return copy;
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      tokens: [],
      isStreaming: false,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInput("");
    setIsStreaming(true);
    setSseStatus("connected");

    // Start thinking indicator
    const agentName = "Orchestrateur";
    setThinkingAgent(agentName);

    const abort = createAgentChatStream(text, sessionId, {
      onToken: (token: string) => {
        setThinkingAgent(null);
        updateLastMessage((msg) => {
          if (msg.role === "agent") {
            return {
              ...msg,
              tokens: [...msg.tokens, token],
              content: msg.content + token,
            };
          }
          // First agent token — create the agent message
          const agentMsg: AgentMessage = {
            id: (Date.now() + 1).toString(),
            role: "agent",
            content: token,
            tokens: [token],
            isStreaming: true,
            timestamp: new Date().toISOString(),
          };
          return agentMsg;
        });

        // Ensure at least one agent message exists
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "agent") {
            const agentMsg: AgentMessage = {
              id: (Date.now() + 1).toString(),
              role: "agent",
              content: token,
              tokens: [token],
              isStreaming: true,
              timestamp: new Date().toISOString(),
            };
            return [...prev, agentMsg];
          }
          return prev;
        });
      },
      onToolCall: (toolCall: Record<string, unknown>) => {
        setThinkingAgent(null);
        // Check for proactive notifications from tool calls
        const tcType = (toolCall.type as string) || "";
        if (
          tcType === "proactive_alert" ||
          tcType === "alert_detected"
        ) {
          const proactiveData = toolCall.data as Record<string, unknown> | undefined;
          const proactiveMsg: AgentMessage = {
            id: (Date.now() + 1).toString(),
            role: "agent",
            content: "",
            tokens: [],
            isStreaming: false,
            isProactive: true,
            timestamp: new Date().toISOString(),
            proactiveEvent: {
              eventType: (proactiveData?.eventType as string) || "Événement",
              zone: (proactiveData?.zone as string) || "Zone inconnue",
              severity:
                (proactiveData?.severity as
                  | "CRITICAL"
                  | "HIGH"
                  | "MEDIUM"
                  | "LOW"
                  | "INFO") || "MEDIUM",
            },
          };
          setMessages((prev) => [...prev, proactiveMsg]);
        }

        updateLastMessage((msg) => ({
          ...msg,
          toolCalls: [
            ...(msg.toolCalls || []),
            {
              type: tcType,
              name: (toolCall.name as string) || tcType,
              input: toolCall.input,
              output: toolCall.output,
            },
          ],
        }));
      },
      onDone: (content: string) => {
        setThinkingAgent(null);
      updateLastMessage((msg) => ({
        ...msg,
        isStreaming: false,
        content: content || msg?.content || "",
      }));
      setIsStreaming(false);
    },
    onError: (error: string) => {
      setThinkingAgent(null);
      updateLastMessage((msg) => ({
        ...msg,
        isStreaming: false,
        content: msg?.content || `Erreur: ${error}`,
      }));
        setIsStreaming(false);
        setSseStatus("disconnected");
      },
    });

    abortRef.current = abort;
  };

  const handleRetry = () => {
    setSseStatus("connected");
    // Retry last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Re-send the last user query
      setIsStreaming(true);
      setThinkingAgent("Orchestrateur");
      const abort = createAgentChatStream(
        lastUserMsg.content,
        sessionId,
        {
          onToken: (token: string) => {
            setThinkingAgent(null);
            updateLastMessage((msg) => ({
              ...msg,
              tokens: [...msg.tokens, token],
              content: msg.content + token,
            }));
          },
          onToolCall: (toolCall: Record<string, unknown>) => {},
          onDone: (content: string) => {
            setThinkingAgent(null);
            updateLastMessage((msg) => ({
              ...msg,
              isStreaming: false,
            }));
            setIsStreaming(false);
          },
          onError: (error: string) => {
            setThinkingAgent(null);
            setIsStreaming(false);
            setSseStatus("disconnected");
          },
        }
      );
      abortRef.current = abort;
    }
  };

  const quickActions = [
    {
      id: "alerts",
      label: "Voir les alertes",
      icon: Sparkles,
      onClick: () => setInput("Voir les alertes"),
    },
    {
      id: "cameras",
      label: "Caméras actives",
      icon: Sparkles,
      onClick: () => setInput("Caméras actives"),
    },
    {
      id: "doors",
      label: "État des portes",
      icon: Sparkles,
      onClick: () => setInput("État des portes"),
    },
    {
      id: "report",
      label: "Signalement",
      icon: Sparkles,
      onClick: () => setInput("Faire un signalement"),
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-xl border bg-card/60 backdrop-blur-sm border-border/40 shadow-[0_8px_32px_hsl(var(--shadcn-primary)/0.04)]",
        className
      )}
    >
      {/* SSE Status Banner */}
      <SSEStatusBanner
        status={sseStatus}
        onRetry={handleRetry}
        className="m-3 mb-0"
      />

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Agent de sécurité activé
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Posez une question ou sélectionnez une action ci-dessous
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {SUGGESTED_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-full transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {msg.isProactive && msg.proactiveEvent ? (
                  <ProactiveNotification
                    eventType={msg.proactiveEvent.eventType}
                    zone={msg.proactiveEvent.zone}
                    timestamp={msg.timestamp}
                    severity={msg.proactiveEvent.severity}
                  />
                ) : (
                  <ChatMessage
                    role={msg.role}
                    content={msg.content}
                    tokens={msg.tokens}
                    isStreaming={msg.isStreaming}
                    toolCalls={msg.toolCalls}
                    timestamp={msg.timestamp}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking indicator */}
          {thinkingAgent && (
            <AgentThinkingIndicator
              agentName={thinkingAgent}
              status={isStreaming ? "responding" : "thinking"}
            />
          )}

          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} className="mx-4" />

      {/* Input */}
      <div className="flex items-center gap-2 p-4 pt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Posez une question..."
          disabled={isStreaming}
          className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
        <Button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          size="icon"
          aria-label="Envoyer le message"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-3 text-center text-xs text-muted-foreground/60">
        L&apos;IA peut produire des informations incorrectes. Vérifiez les
        décisions critiques.
      </div>
    </div>
  );
}
