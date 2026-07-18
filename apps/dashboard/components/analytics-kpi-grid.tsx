"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  Bell,
  Camera,
  HardDrive,
  LogIn,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { containerVariants, itemVariants } from "@/components/page-transition";
import { cn } from "@/lib/utils";
import type { BastionKpisDto } from "@repo/shared";

interface AnalyticsKpiGridProps {
  kpis: BastionKpisDto | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_099_511_627_776) return `${(bytes / 1_099_511_627_776).toFixed(1)} To`;
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} Go`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} Mo`;
  return `${bytes} o`;
}

function getStorageColor(percent: number): string {
  if (percent >= 90) return "text-destructive";
  if (percent >= 80) return "text-warning";
  return "text-primary";
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  color?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <motion.div variants={itemVariants}>
      <GlassCard variant="default" className="group p-5 transition-all duration-300 hover:border-primary/30">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="font-mono tabular-nums text-2xl font-semibold tracking-tight">
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10",
            color
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span className={trend.positive ? "text-success" : "text-destructive"}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">vs. hier</span>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

export function AnalyticsKpiGrid({
  kpis,
  loading = false,
  error = null,
  onRetry,
}: AnalyticsKpiGridProps) {
  if (loading) {
    return (
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-10">
        <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
        <p className="mb-1 text-sm font-medium text-destructive">
          Erreur de chargement
        </p>
        <p className="mb-4 text-xs text-muted-foreground">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border py-10">
        <HardDrive className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          Aucune donnée disponible
        </p>
      </div>
    );
  }

  const totalStorageBytes = 1_073_741_824_000; // 1 TB assumed total
  const storagePercent = (kpis.storageUsedBytes / totalStorageBytes) * 100;

  const cards = [
    {
      title: "Incidents aujourd'hui",
      value: kpis.incidentsToday,
      icon: AlertTriangle,
      color: "bg-destructive/10 text-destructive",
    },
    {
      title: "Alertes actives",
      value: kpis.activeAlerts,
      icon: Bell,
      color: "bg-warning/10 text-warning",
    },
    {
      title: "Caméras en ligne",
      value: `${kpis.camerasOnline}`,
      description: `sur ${Math.max(kpis.camerasOnline, 1)} caméras`,
      icon: Camera,
      color: "bg-success/10 text-success",
    },
    {
      title: "Stockage utilisé",
      value: formatBytes(kpis.storageUsedBytes),
      description: `${storagePercent.toFixed(0)}% de la capacité`,
      icon: HardDrive,
      color: cn("bg-primary/10", getStorageColor(storagePercent)),
      valueColor: getStorageColor(storagePercent),
    },
    {
      title: "Entrées aujourd'hui",
      value: kpis.entriesToday,
      icon: LogIn,
      color: "bg-primary/10 text-primary",
    },
  ];

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card, index) => (
        <KpiCard key={index} {...card} />
      ))}
    </motion.div>
  );
}
