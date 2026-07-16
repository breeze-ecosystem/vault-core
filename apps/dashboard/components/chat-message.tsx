"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, ChevronUp, User, Bot, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StreamingText } from "@/components/streaming-text";
import { cn } from "@/lib/utils";

interface ToolCallInfo {
  type: string;
  name?: string;
  input?: unknown;
  output?: unknown;
}

interface ChatMessageProps {
  role: "user" | "agent";
  content: string;
  tokens?: string[];
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
  timestamp?: string;
  sources?: Array<{ type: string; name: string; summary: string }>;
  className?: string;
}

export function ChatMessage({
  role,
  content,
  tokens,
  isStreaming = false,
  toolCalls,
  timestamp,
  sources,
  className,
}: ChatMessageProps) {
  const [expandedToolCall, setExpandedToolCall] = useState<number | null>(null);
  const isUser = role === "user";

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {/* Agent avatar */}
      {!isUser && (
        <div className="mt-1 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}

      <div className={cn("max-w-[80%] min-w-0")}>
        {/* Message bubble */}
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-primary/[0.04] border border-primary/[0.12]"
          )}
        >
          {isStreaming && tokens ? (
            <StreamingText tokens={tokens} isStreaming={isStreaming} />
          ) : (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          )}
        </div>

        {/* Tool calls */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {toolCalls.map((tc, i) => (
              <div key={i} className="rounded-lg border bg-card/60 overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedToolCall(expandedToolCall === i ? null : i)
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-secondary/40 transition-colors"
                >
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 text-left">
                    {tc.name || tc.type}
                  </span>
                  {expandedToolCall === i ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {expandedToolCall === i && (
                  <div className="border-t px-3 py-2 space-y-1.5">
                    {tc.input != null && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Entrée
                        </span>
                        <pre className="mt-0.5 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto rounded bg-secondary/30 p-2">
                          {JSON.stringify(tc.input, null, 2).slice(0, 500)}
                        </pre>
                      </div>
                    )}
                    {tc.output != null && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Résultat
                        </span>
                        <pre className="mt-0.5 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto rounded bg-secondary/30 p-2">
                          {typeof tc.output === "string"
                            ? tc.output.slice(0, 500)
                            : JSON.stringify(tc.output, null, 2).slice(0, 500)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="mt-2 space-y-1">
            {sources.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card/40 px-3 py-1.5 text-xs"
              >
                <span className="font-medium">{s.name || s.type}</span>
                <span className="ml-2 text-muted-foreground">{s.summary}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {time && (
          <div
            className={cn(
              "mt-1 text-xs text-muted-foreground",
              isUser ? "text-right" : "text-left"
            )}
          >
            {time}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="mt-1 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
