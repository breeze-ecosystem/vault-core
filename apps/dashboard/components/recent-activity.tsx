"use client";

import { AlertTriangle, Info, AlertCircle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  createdAt: string;
  camera?: { id: string; name: string };
}

const severityConfig: Record<string, { color: string; bg: string; icon: typeof AlertTriangle }> = {
  CRITICAL: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertOctagon },
  HIGH: { color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
  MEDIUM: { color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertCircle },
  LOW: { color: "text-primary", bg: "bg-primary/10", icon: Info },
  INFO: { color: "text-muted-foreground", bg: "bg-muted", icon: Info },
};

export function RecentActivity({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">
          Aucune activité récente
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Les alertes apparaîtront ici en temps réel
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {alerts.map((alert, index) => {
        const config = (severityConfig[alert.severity] ?? severityConfig.INFO)!;
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{alert.title}</p>
              {alert.camera?.name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {alert.camera.name}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                config.bg, config.color
              )}>
                {alert.severity}
              </span>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {formatTime(alert.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
