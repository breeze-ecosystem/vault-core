"use client";

import { Video, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TimelineEntryDto } from "@/lib/api";

interface EventDetailProps {
  event: TimelineEntryDto;
  onClose: () => void;
}

/**
 * Event detail drawer with OSDP hardware details section (D-08)
 * and inline camera thumbnail (D-09).
 */
export function EventDetail({ event, onClose }: EventDetailProps) {
  const metadata = event.metadata as Record<string, unknown> | undefined;

  // OSDP-specific fields from metadata
  const badgeNumber = metadata?.badgeNumber as string | undefined;
  const direction = metadata?.direction as string | undefined;
  const tampered = metadata?.tampered as boolean | undefined;
  const controllerSerial = metadata?.controllerSerial as string | undefined;
  const lastSnapshotUrl = metadata?.lastSnapshotUrl as string | undefined;
  const hasOsdpDetails = badgeNumber || direction || controllerSerial;

  function formatAbsoluteTime(iso: string): string {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="border-t bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">
          {event.doorName || "Porte " + event.doorId?.slice(0, 8)}
          <span className="ml-2 text-xs text-muted-foreground">
            {formatAbsoluteTime(event.timestamp)}
          </span>
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <span aria-hidden>✕</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Media section */}
        <div className="overflow-hidden rounded-lg bg-gray-900">
          {event.snapshotUrl ? (
            <img
              src={event.snapshotUrl}
              alt="Snapshot"
              className="w-full object-cover max-h-64"
            />
          ) : event.videoThumbnailUrl ? (
            <img
              src={event.videoThumbnailUrl}
              alt="Thumbnail"
              className="w-full object-cover max-h-64"
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <div className="text-center">
                <Video className="mx-auto mb-2 h-8 w-8" />
                <p className="text-sm">Corrélation vidéo en cours...</p>
              </div>
            </div>
          )}
        </div>

        {/* Details section */}
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Événement: </span>
            <span className="font-medium">{event.summary}</span>
          </div>
          {event.detail && (
            <div>
              <span className="text-muted-foreground">Détail: </span>
              <span>{event.detail}</span>
            </div>
          )}

          {/* OSDP Hardware Details Section (D-08) */}
          {hasOsdpDetails && (
            <div className="mt-3 space-y-1 text-sm">
              <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                Détails matériel
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {badgeNumber && (
                  <>
                    <span className="text-muted-foreground">Badge:</span>
                    <span className="font-mono">#{badgeNumber}</span>
                  </>
                )}
                {direction && (
                  <>
                    <span className="text-muted-foreground">Direction:</span>
                    <span>
                      {direction === "ingress" ? "⬈ Entrée" : "⬉ Sortie"}
                    </span>
                  </>
                )}
                {controllerSerial && (
                  <>
                    <span className="text-muted-foreground">Contrôleur:</span>
                    <span className="font-mono text-xs">
                      {controllerSerial}
                    </span>
                  </>
                )}
                {tampered && (
                  <>
                    <span className="text-muted-foreground">Sabotage:</span>
                    <Badge
                      variant="outline"
                      className="text-orange-400 border-orange-500/30 w-fit"
                    >
                      Sabotage
                    </Badge>
                  </>
                )}
              </div>

              {/* Inline Camera Thumbnail (D-09) */}
              {lastSnapshotUrl && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                  <div className="h-12 w-16 overflow-hidden rounded bg-gray-800 shrink-0">
                    <img
                      src={lastSnapshotUrl}
                      alt="Aperçu caméra"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/cameras" target="_blank" rel="noopener noreferrer">
                      <Eye className="mr-1 h-3 w-3" />
                      Voir le clip
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Raw metadata fallback */}
          {metadata && Object.keys(metadata).length > 0 && !hasOsdpDetails && (
            <div>
              <span className="text-muted-foreground">Métadonnées: </span>
              <pre className="mt-1 text-xs text-muted-foreground overflow-auto max-h-32 bg-muted p-2 rounded">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          )}

          {event.snapshotUrl && (
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <a href="/cameras" target="_blank" rel="noopener noreferrer">
                <Eye className="mr-1 h-4 w-4" />
                Ouvrir dans les caméras
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
