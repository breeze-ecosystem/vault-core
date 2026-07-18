"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Image, Play, RefreshCw, CameraOff, AlertCircle } from "lucide-react";

interface CorrelatedSnapshotPreviewProps {
  eventType?: string;
  timestamp?: string;
  cameraName?: string;
  snapshotUrl?: string | null;
  clipUrl?: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function CorrelatedSnapshotPreview({
  eventType,
  timestamp,
  cameraName,
  snapshotUrl,
  clipUrl,
  loading = false,
  error = null,
  onRetry,
}: CorrelatedSnapshotPreviewProps) {
  const [showClip, setShowClip] = useState(false);

  // Loading state
  if (loading) {
    return (
      <GlassCard className="overflow-hidden">
        <Skeleton className="aspect-video w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium">Erreur de capture</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Réessayer
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      {snapshotUrl ? (
        <div className="relative aspect-video bg-muted overflow-hidden">
          <img
            src={snapshotUrl}
            alt={`Snapshot ${cameraName || ""}`}
            className="h-full w-full object-cover"
          />
          {clipUrl && (
            <button
              onClick={() => setShowClip(!showClip)}
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm hover:bg-background/90 transition-all"
            >
              <Play className="h-3 w-3" />
              {showClip ? "Masquer" : "Voir le clip"}
            </button>
          )}
          {/* Event overlay */}
          <div className="absolute left-2 top-2 rounded-lg bg-background/80 px-2 py-1 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {eventType && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {eventType}
                </span>
              )}
              {timestamp && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(timestamp).toLocaleString("fr-FR")}
                </span>
              )}
            </div>
            {cameraName && (
              <p className="text-[10px] text-muted-foreground">{cameraName}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CameraOff className="h-8 w-8 text-muted-foreground opacity-40" />
          <div>
            <p className="text-sm font-medium">Aucune caméra à proximité</p>
            <p className="text-xs text-muted-foreground">
              Aucune caméra disponible pour la corrélation vidéo dans cette zone.
            </p>
          </div>
        </div>
      )}

      {showClip && clipUrl && (
        <div className="border-t">
          <video
            src={clipUrl}
            controls
            className="w-full aspect-video bg-black"
            autoPlay
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>
      )}
    </GlassCard>
  );
}
