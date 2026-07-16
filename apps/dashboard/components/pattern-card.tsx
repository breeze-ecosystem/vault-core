"use client";

import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Eye, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";

interface PatternDetail {
  id: string;
  name: string;
  severity: "info" | "warning" | "critical";
  sparklineData: number[];
  occurrenceCount: number;
  trendPercent: number;
  description?: string;
}

interface PatternCardProps {
  pattern: PatternDetail;
  onViewDetails?: (patternId: string) => void;
  className?: string;
}

const severityConfig = {
  info: {
    badgeVariant: "default" as const,
    label: "Info",
    color: "text-muted-foreground",
  },
  warning: {
    badgeVariant: "warning" as const,
    label: "Avertissement",
    color: "text-amber-400",
  },
  critical: {
    badgeVariant: "destructive" as const,
    label: "Critique",
    color: "text-destructive",
  },
};

export function PatternCard({
  pattern,
  onViewDetails,
  className,
}: PatternCardProps) {
  const sev = severityConfig[pattern.severity] || severityConfig.info;
  const trendUp = pattern.trendPercent > 0;
  const trendAbs = Math.abs(pattern.trendPercent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard variant="default" className={cn("p-5", className)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <AlertTriangle className={cn("h-4 w-4", sev.color)} />
            </div>
          </div>
          <Badge variant={sev.badgeVariant}>{sev.label}</Badge>
        </div>

        {/* Pattern name */}
        <h3 className="text-lg font-semibold leading-tight mb-2">
          {pattern.name}
        </h3>

        {/* Sparkline */}
        {pattern.sparklineData && pattern.sparklineData.length > 0 && (
          <div className="mb-3">
            <Sparkline
              data={pattern.sparklineData}
              height={40}
              color={
                pattern.severity === "critical"
                  ? "hsl(var(--shadcn-destructive))"
                  : pattern.severity === "warning"
                    ? "hsl(var(--shadcn-warning))"
                    : "hsl(var(--shadcn-primary))"
              }
            />
          </div>
        )}

        {/* Occurrence count */}
        <div className="font-mono tabular-nums text-2xl font-semibold tracking-tight">
          {pattern.occurrenceCount}
        </div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
          Occurrences
        </div>

        {/* Trend */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              trendUp
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success"
            )}
          >
            {trendUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {trendUp ? "↑" : "↓"} {trendAbs}% cette semaine
            </span>
          </div>
        </div>

        {/* Description */}
        {pattern.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {pattern.description}
          </p>
        )}

        {/* View details button */}
        <div className="mt-4 pt-3 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => onViewDetails?.(pattern.id)}
          >
            <Eye className="h-3.5 w-3.5" />
            Voir les détails
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
