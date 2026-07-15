"use client";

import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";

type ActivityAlert = {
  id: string;
  title: string;
  severity: string;
  createdAt: string;
  camera?: { name: string } | null;
};

interface ActivityTimelineProps {
  alerts: ActivityAlert[];
  className?: string;
  maxItems?: number;
}

const severityColor: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#06b6d4",
  LOW: "#94a3b8",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export function ActivityTimeline({
  alerts,
  className,
  maxItems = 10,
}: ActivityTimelineProps) {
  const displayed = alerts.slice(0, maxItems);

  if (displayed.length === 0) {
    return (
      <GlassCard variant="default" className={cn("p-8", className)}>
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 opacity-40" />
          <p className="text-sm">Aucune activité récente</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className={cn("p-4", className)}>
      <motion.div
        className="flex flex-col gap-1"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.04, delayChildren: 0.05 },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {displayed.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/40"
            >
              <div
                className="mt-0.5 h-full min-h-[2.5rem] w-[3px] shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    severityColor[alert.severity] || severityColor.LOW,
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{alert.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {alert.camera?.name && (
                    <span className="text-xs text-muted-foreground">
                      {alert.camera.name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/60">
                    {formatTime(alert.createdAt)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </GlassCard>
  );
}
