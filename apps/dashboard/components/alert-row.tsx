"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, Camera } from "lucide-react";

interface AlertRowProps {
  alert: {
    id: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
    camera?: { id: string; name: string } | null;
    snapshotUrl?: string | null;
  };
  selected?: boolean;
  onSelect?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onViewCamera?: (id: string) => void;
  className?: string;
}

const severityBorder: Record<string, string> = {
  CRITICAL: "border-l-destructive",
  HIGH: "border-l-warning",
  MEDIUM: "border-l-primary",
  LOW: "border-l-muted-foreground",
  INFO: "border-l-muted",
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

export function AlertRow({
  alert,
  selected,
  onSelect,
  onAcknowledge,
  onViewCamera,
  className,
}: AlertRowProps) {
  const borderColor = severityBorder[alert.severity] || severityBorder.LOW;

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 border-l-[3px]",
        borderColor,
        selected ? "bg-muted/30" : "hover:bg-muted/50",
        className
      )}
      onClick={() => onSelect?.(alert.id)}
    >
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
      <div className="flex items-center gap-1 shrink-0">
        {onViewCamera && alert.camera?.id && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onViewCamera(alert.camera!.id); }}
            title="Voir la caméra"
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
        {alert.status === "OPEN" && onAcknowledge && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id); }}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prendre en compte</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
