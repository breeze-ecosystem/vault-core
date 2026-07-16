"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface StreamingTextProps {
  tokens: string[];
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({
  tokens,
  isStreaming,
  className,
}: StreamingTextProps) {
  const [displayedTokens, setDisplayedTokens] = useState<string[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Accumulate tokens with 50ms stagger
  useEffect(() => {
    if (tokens.length === 0) {
      setDisplayedTokens([]);
      return;
    }

    // If we already have all tokens, show them all
    if (displayedTokens.length >= tokens.length) {
      setDisplayedTokens(tokens);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedTokens(tokens.slice(0, displayedTokens.length + 1));
    }, 50);

    return () => clearTimeout(timer);
  }, [tokens, displayedTokens.length]);

  // Blinking cursor animation
  useEffect(() => {
    if (!isStreaming) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);

    return () => clearInterval(interval);
  }, [isStreaming]);

  if (tokens.length === 0 && !isStreaming) return null;

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {displayedTokens.join("")}
      {isStreaming && (
        <span
          className={cn(
            "inline-block w-[0.6em] h-[1.1em] -mb-[0.15em] ml-[0.05em] rounded-[1px] bg-primary align-baseline transition-opacity duration-100",
            cursorVisible ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
