"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SSEStatusBannerProps {
  status: "connected" | "reconnecting" | "disconnected";
  onRetry?: () => void;
  className?: string;
}

export function SSEStatusBanner({
  status,
  onRetry,
  className,
}: SSEStatusBannerProps) {
  if (status === "connected") return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm",
        status === "reconnecting"
          ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
          : "bg-destructive/10 border border-destructive/30 text-destructive",
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        {status === "reconnecting" ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="font-medium">
              Connexion perdue. Reconnexion en cours...
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="font-medium">Déconnecté du serveur</span>
          </>
        )}
      </div>
      {status === "disconnected" && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1.5 shrink-0"
        >
          <Wifi className="h-3.5 w-3.5" />
          Reconnexion
        </Button>
      )}
    </div>
  );
}
