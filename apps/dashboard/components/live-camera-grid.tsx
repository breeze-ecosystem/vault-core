'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Video, VideoOff, Eye, Camera as CameraIcon } from 'lucide-react';
import { GlassCard } from '@/components/glass-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SubstreamToggle } from '@/components/substream-toggle';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Camera } from '@/lib/api';

interface LiveCameraGridProps {
  cameras: Camera[];
  onCameraClick?: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAddCamera?: () => void;
  maxCameras?: number;
  className?: string;
}

const statusDot: Record<string, { color: string; label: string }> = {
  ONLINE: { color: 'bg-green-500', label: 'En ligne' },
  OFFLINE: { color: 'bg-red-500', label: 'Hors ligne' },
  MAINTENANCE: { color: 'bg-amber-500', label: 'Maintenance' },
  DEGRADED: { color: 'bg-orange-500', label: 'Dégradé' },
};

export function LiveCameraGrid({
  cameras,
  onCameraClick,
  loading = false,
  error = null,
  onRetry,
  onAddCamera,
  maxCameras = 10,
  className,
}: LiveCameraGridProps) {
  const [substreams, setSubstreams] = useState<Record<string, 'hd' | 'sd'>>({});

  const handleSubstreamToggle = (cameraId: string) => {
    setSubstreams((prev) => ({
      ...prev,
      [cameraId]: prev[cameraId] === 'hd' ? 'sd' : 'hd',
    }));
  };

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-lg overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <GlassCard variant="default" className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <VideoOff className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Erreur de chargement</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
              Réessayer
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (cameras.length === 0) {
    return (
      <GlassCard variant="default" className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
            <VideoOff className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">Aucune caméra configurée</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajoutez votre première caméra pour commencer
          </p>
          {onAddCamera && (
            <Button variant="default" size="sm" className="mt-4 gap-2" onClick={onAddCamera}>
              <CameraIcon className="h-4 w-4" />
              Ajoutez votre première caméra
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  // ── Camera grid ─────────────────────────────────────────────────────────
  const limitReached = cameras.length >= maxCameras;

  return (
    <div className={cn('space-y-4', className)}>
      {limitReached && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-xs text-warning">
          Limite de {maxCameras} caméras atteinte. Passez au pack BASTION.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {cameras.map((camera, i) => {
          const sd = substreams[camera.id] ?? 'hd';
          const dot = statusDot[camera.status] ?? statusDot.OFFLINE!;
          const isOnline = camera.status === 'ONLINE';

          return (
            <motion.div
              key={camera.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <div
                className={cn(
                  'group relative aspect-video rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer',
                  isOnline
                    ? 'border-border/40 bg-secondary/30 hover:border-primary/40'
                    : 'border-border/20 bg-secondary/20 opacity-75',
                )}
                onClick={() => onCameraClick?.(camera.id)}
              >
                {/* Camera thumbnail */}
                {camera.lastSnapshotUrl ? (
                  <img
                    src={camera.lastSnapshotUrl}
                    alt={camera.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary/50 to-secondary/20">
                    <Video className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}

                {/* Hover overlay */}
                <Link
                  href={`/cameras/${camera.id}`}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm" variant="secondary" className="gap-2 backdrop-blur-sm">
                    <Eye className="h-4 w-4" />
                    Voir le flux
                  </Button>
                </Link>

                {/* Status dot */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                  {isOnline && camera.isRecording && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                      </span>
                      Enr.
                    </span>
                  )}
                  <div className={cn('h-2 w-2 rounded-full ring-1 ring-black/20', dot.color)} />
                </div>

                {/* Substream toggle */}
                {isOnline && (
                  <div className="absolute top-1.5 left-1.5">
                    <SubstreamToggle
                      current={sd}
                      onToggle={() => handleSubstreamToggle(camera.id)}
                    />
                  </div>
                )}

                {/* Camera name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <p className="text-[11px] text-white font-medium truncate leading-tight">
                    {camera.name}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
