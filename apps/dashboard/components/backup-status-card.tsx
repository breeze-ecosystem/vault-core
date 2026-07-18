"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { itemVariants } from "@/components/page-transition";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Calendar,
  Clock,
  Database,
  AlertCircle,
} from "lucide-react";
import type { BackupJobDto } from "@/lib/api";

interface BackupStatusCardProps {
  status: BackupJobDto | null;
  nextBackupAt?: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function formatFileSize(bytes: string | null): string {
  if (!bytes) return "—";
  const num = Number(bytes);
  if (num === 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  return `${(num / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Jamais";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function BackupStatusCard({
  status,
  nextBackupAt,
  loading = false,
  error = null,
  onRetry,
}: BackupStatusCardProps) {
  // Loading state
  if (loading) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">
                  Erreur de chargement
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Réessayer
              </Button>
            )}
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  // Empty state — no backup configured
  if (!status) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <HardDrive className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Sauvegarde non configurée
                </p>
                <p className="text-xs text-muted-foreground">
                  Configurez la sauvegarde NAS pour protéger vos données
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  const isHealthy = status.status === "SUCCESS";
  const isRunning = status.status === "RUNNING";
  const isFailed = status.status === "FAILED";

  const healthLabel = isRunning
    ? "Sauvegarde en cours"
    : isHealthy
      ? "Sauvegarde saine"
      : "Sauvegarde défaillante";

  const StatusIcon = isRunning
    ? AlertTriangle
    : isHealthy
      ? CheckCircle2
      : XCircle;

  const statusColor = isRunning
    ? "text-warning"
    : isHealthy
      ? "text-success"
      : "text-destructive";

  const bgColor = isRunning
    ? "bg-warning/20"
    : isHealthy
      ? "bg-success/20"
      : "bg-destructive/20";

  return (
    <motion.div variants={itemVariants}>
      <GlassCard
        className={cn(
          "p-5 transition-all duration-300",
          isFailed && "border-destructive/40 shadow-[0_0_16px_hsl(var(--destructive)/0.15)]",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                bgColor,
              )}
            >
              <StatusIcon className={cn("h-6 w-6", statusColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{healthLabel}</span>
                {isRunning && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-warning animate-pulse" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Statut global de la sauvegarde NAS
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              Dernière sauvegarde
            </div>
            <p className="text-sm font-medium">
              {formatDate(status?.completedAt || status?.startedAt)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              Prochaine sauvegarde
            </div>
            <p className="text-sm font-medium">
              {formatDate(nextBackupAt || null)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Database className="h-3 w-3" />
              Taille des données
            </div>
            <p className="text-sm font-medium">
              {formatFileSize(status?.sizeBytes || null)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <AlertCircle className="h-3 w-3" />
              Statut
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-2 w-2 rounded-full",
                  isRunning && "bg-warning",
                  isHealthy && "bg-success",
                  isFailed && "bg-destructive",
                )}
              />
              <span className="text-sm font-medium capitalize">
                {isRunning
                  ? "En cours"
                  : isHealthy
                    ? "Saine"
                    : "Échouée"}
              </span>
            </div>
          </div>
        </div>

        {isFailed && status?.error && (
          <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {status.error}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
