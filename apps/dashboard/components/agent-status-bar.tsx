"use client";

import { motion } from "motion/react";
import { Circle } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";

interface AgentStatus {
  name: string;
  status: "idle" | "thinking" | "responding" | "error";
  model?: string;
}

interface AgentStatusBarProps {
  agents: AgentStatus[];
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: "En attente", color: "text-muted-foreground", pulse: false },
  thinking: { label: "Réflexion", color: "text-amber-400", pulse: true },
  responding: { label: "Actif", color: "text-primary", pulse: true },
  error: { label: "Erreur", color: "text-destructive", pulse: false },
};

export function AgentStatusBar({ agents, className }: AgentStatusBarProps) {
  return (
    <GlassCard variant="default" className={cn("p-4", className)}>
      <h3 className="text-sm font-semibold mb-3">Agents</h3>
      <div className="flex flex-col gap-2">
        {agents.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun agent détecté
          </p>
        )}
        {agents.map((agent, i) => {
          const config = statusConfig[agent.status] ?? statusConfig.idle;
          const cfg = config!;
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/40"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <Circle
                  className={cn(
                    "h-3 w-3",
                    cfg.color,
                    cfg.pulse && "animate-pulse"
                  )}
                  fill="currentColor"
                />
                {cfg.pulse && (
                  <Circle
                    className={cn(
                      "absolute h-3 w-3 animate-ping opacity-20",
                      cfg.color
                    )}
                    fill="currentColor"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{agent.name}</p>
                {agent.model && (
                  <p className="text-xs text-muted-foreground truncate">
                    {agent.model}
                  </p>
                )}
              </div>
              <span className={cn("text-xs shrink-0", cfg.color)}>
                {cfg.label}
              </span>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
          <span
            className={cn(
              "font-medium",
              agents.some((a) => a.status === "error")
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {agents.every((a) => a.status === "idle")
              ? "Système prêt"
              : agents.some((a) => a.status === "error")
                ? "Problème détecté"
                : "En cours"}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
