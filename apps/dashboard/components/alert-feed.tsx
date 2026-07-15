"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { containerVariants, itemVariants } from "@/components/page-transition";
import { AlertRow } from "@/components/alert-row";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";

interface AlertFeedProps {
  alerts: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
    camera?: { id: string; name: string } | null;
    snapshotUrl?: string | null;
  }>;
  loading?: boolean;
  selectedId?: string | null;
  onSelectAlert?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onViewCamera?: (id: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function AlertFeed({
  alerts,
  loading,
  selectedId,
  onSelectAlert,
  onAcknowledge,
  onViewCamera,
  emptyMessage = "Aucune alerte active",
  className,
}: AlertFeedProps) {
  if (loading) {
    return (
      <div className={cn("space-y-1", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mb-3" />
        <p className="text-base font-medium">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Toutes les alertes ont été traitées
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("divide-y divide-border/50", className)}
    >
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <AlertRow
            key={alert.id}
            alert={alert}
            selected={selectedId === alert.id}
            onSelect={onSelectAlert}
            onAcknowledge={onAcknowledge}
            onViewCamera={onViewCamera}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
