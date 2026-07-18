"use client";

import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/components/page-transition";
import type { AnalyticsTrendPoint } from "@/lib/api";

interface TrendChartCardProps {
  metric: string;
  data: AnalyticsTrendPoint[];
  granularity: 7 | 30;
  onGranularityChange: (days: 7 | 30) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function formatDateLabel(bucket: string): string {
  try {
    const d = new Date(bucket);
    if (isNaN(d.getTime())) return bucket;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return bucket;
  }
}

export function TrendChartCard({
  metric,
  data,
  granularity,
  onGranularityChange,
  loading = false,
  error = null,
  onRetry,
}: TrendChartCardProps) {
  if (loading) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </GlassCard>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
            <p className="mb-1 text-sm font-medium text-destructive">
              Erreur de chargement des tendances
            </p>
            <p className="mb-4 text-xs text-muted-foreground">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Réessayer
              </Button>
            )}
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{metric}</h3>
            <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => onGranularityChange(7)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  granularity === 7
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                7 jours
              </button>
              <button
                onClick={() => onGranularityChange(30)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  granularity === 30
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                30 jours
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-10">
            <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune donnée</p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  const metricLabels: Record<string, string> = {
    incidents: "Incidents",
    alerts: "Alertes",
    entries: "Entrées",
    denied_count: "Accès refusés",
    door_anomaly_count: "Anomalies de porte",
  };

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {metricLabels[metric] || metric}
          </h3>
          <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => onGranularityChange(7)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                granularity === 7
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              7 jours
            </button>
            <button
              onClick={() => onGranularityChange(30)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                granularity === 30
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              30 jours
            </button>
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="bucket"
                tickFormatter={formatDateLabel}
                className="text-xs"
                tick={{ fill: "currentColor" }}
                interval="preserveStartEnd"
              />
              <YAxis className="text-xs" tick={{ fill: "currentColor" }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(label) => formatDateLabel(label)}
                formatter={(value: number) => [value, metricLabels[metric] || metric]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--shadcn-primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--shadcn-primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </motion.div>
  );
}
