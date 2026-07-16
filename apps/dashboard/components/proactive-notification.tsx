"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProactiveNotificationProps {
  eventType: string;
  zone: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  className?: string;
}

const severityBadgeVariant: Record<string, "destructive" | "warning" | "default" | "success"> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "default",
  INFO: "success",
};

const severityLabel: Record<string, string> = {
  CRITICAL: "Critique",
  HIGH: "Élevé",
  MEDIUM: "Moyen",
  LOW: "Faible",
  INFO: "Info",
};

export function ProactiveNotification({
  eventType,
  zone,
  timestamp,
  severity,
  className,
}: ProactiveNotificationProps) {
  const time = new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        severity === "CRITICAL" || severity === "HIGH"
          ? "bg-red-500/5 border-red-500/20"
          : "bg-amber-500/5 border-amber-500/20",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={severityBadgeVariant[severity] || "default"}>
            {severityLabel[severity] || severity}
          </Badge>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm font-medium">
          {eventType} détecté sur {zone}
        </p>
      </div>
    </div>
  );
}
