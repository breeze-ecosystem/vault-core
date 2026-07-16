"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AgentThinkingIndicatorProps {
  agentName: string;
  status: "thinking" | "responding";
  className?: string;
}

export function AgentThinkingIndicator({
  agentName,
  status,
  className,
}: AgentThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {agentName}
        </span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "thinking" ? "bg-amber-400" : "bg-primary"
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-medium",
          status === "thinking" ? "text-amber-400" : "text-primary"
        )}
      >
        {status === "thinking" ? "Réflexion..." : "Réponse en cours..."}
      </span>
    </div>
  );
}
