'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Play, X, Shield, Hash, DoorOpen, User, Clock, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccessEvent } from '@/lib/api';

interface CorrelatedSnapshotProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotUrl?: string;
  videoClipUrl?: string;
  event: AccessEvent;
}

export function CorrelatedSnapshot({
  isOpen,
  onClose,
  snapshotUrl,
  videoClipUrl,
  event,
}: CorrelatedSnapshotProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Événement d&apos;accès corrélé</DialogTitle>
            <Badge
              variant={event.decision === 'granted' ? 'success' : 'destructive'}
              className="text-[10px]"
            >
              {event.decision === 'granted' ? 'Accès autorisé' : 'Accès refusé'}
            </Badge>
          </div>
          <DialogDescription>
            Détails de l&apos;événement avec preuve vidéo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Snapshot image */}
          {snapshotUrl ? (
            <div className="relative rounded-xl overflow-hidden bg-muted/30 border border-border">
              {!imageLoaded && (
                <div className="aspect-video flex items-center justify-center">
                  <Skeleton className="absolute inset-0" />
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={snapshotUrl}
                alt="Snapshot corrélé"
                className={cn('w-full object-cover', imageLoaded ? 'block' : 'hidden')}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>
          ) : (
            <div className="aspect-video rounded-xl bg-muted/20 flex items-center justify-center border border-border">
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground mt-2">Aucun snapshot disponible</p>
              </div>
            </div>
          )}

          {/* Video clip */}
          {videoClipUrl && (
            <div>
              {videoPlaying ? (
                <div className="rounded-xl overflow-hidden border border-border bg-black">
                  <video
                    src={videoClipUrl}
                    controls
                    autoPlay
                    className="w-full aspect-video"
                    onEnded={() => setVideoPlaying(false)}
                  />
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setVideoPlaying(true)}
                >
                  <Play className="h-4 w-4" />
                  Voir la vidéo 10s
                </Button>
              )}
            </div>
          )}

          {/* Event metadata */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/10 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Porte:</span>
              <span className="text-xs font-medium">{event.door?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Personne:</span>
              <span className="text-xs font-medium">
                {event.user
                  ? `${event.user.firstName} ${event.user.lastName}`
                  : event.credential?.badgeNumber || 'Inconnu'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Date:</span>
              <span className="text-xs font-medium">
                {new Date(event.timestamp).toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Décision:</span>
              <Badge
                variant={event.decision === 'granted' ? 'success' : 'destructive'}
                className="text-[10px]"
              >
                {event.decision === 'granted' ? 'Autorisé' : 'Refusé'}
              </Badge>
            </div>
            {event.reason && (
              <div className="col-span-2 flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">Motif:</span>
                <span className="text-xs">{event.reason}</span>
              </div>
            )}
          </div>

          {/* Chain-of-custody */}
          {event.id && (
            <p className="text-[10px] text-muted-foreground text-center">
              ID de preuve : <code className="font-mono">{event.id}</code>
              {' · '}Horodaté et journalisé
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


