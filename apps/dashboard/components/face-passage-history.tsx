'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LivenessIndicator } from '@/components/liveness-indicator';
import { FaceRiskScore } from '@/components/face-risk-score';
import { Camera, Clock, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFacePassages, type FacePassage } from '@/lib/api';

interface FacePassageHistoryProps {
  faceId: string;
  className?: string;
}

export function FacePassageHistory({ faceId, className }: FacePassageHistoryProps) {
  const [passages, setPassages] = useState<FacePassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPassages = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await getFacePassages(faceId, { page: pageNum, limit: 10 });
      if (append) {
        setPassages((prev) => [...prev, ...result.data]);
      } else {
        setPassages(result.data);
      }
      setTotal(result.total);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [faceId]);

  useEffect(() => {
    loadPassages(1);
  }, [loadPassages]);

  const handleLoadMore = () => {
    loadPassages(page + 1, true);
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassCard variant="default" className={cn('p-4', className)}>
        <div className="flex items-center gap-3">
          <Camera className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium">Erreur de chargement</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => loadPassages(1)}>
            Réessayer
          </Button>
        </div>
      </GlassCard>
    );
  }

  // Empty state
  if (passages.length === 0) {
    return (
      <GlassCard variant="default" className={cn('flex items-center justify-center py-10', className)}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/30">
            <Camera className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">Aucun passage enregistré</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ce visage n&apos;a pas encore été détecté par les caméras.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border/50" />

        <div className="space-y-4">
          {passages.map((passage, idx) => (
            <div key={passage.id} className="flex items-start gap-3 relative">
              {/* Timeline dot */}
              <div
                className={cn(
                  'h-3 w-3 rounded-full mt-1.5 shrink-0 ring-2 ring-background z-10',
                  passage.matched ? 'bg-success' : 'bg-muted-foreground/40',
                )}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {passage.camera?.name || 'Caméra inconnue'}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(passage.createdAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {/* Risk score badge */}
                  {passage.riskScore != null && (
                    <FaceRiskScore score={passage.riskScore} size="sm" showLabel={false} inline />
                  )}

                  {/* Liveness indicator */}
                  {passage.livenessScore != null && (
                    <LivenessIndicator score={passage.livenessScore} className="shrink-0" />
                  )}
                </div>

                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {new Date(passage.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Snapshot thumbnail */}
              {passage.snapshotUrl ? (
                <div className="h-14 w-14 rounded-lg overflow-hidden border border-border shrink-0">
                  <img
                    src={passage.snapshotUrl}
                    alt="Snapshot"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                  <ImageOff className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Load more */}
      {passages.length < total && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Chargement...' : 'Charger plus'}
          </Button>
        </div>
      )}

      {passages.length > 0 && passages.length >= total && total > 10 && (
        <p className="text-center text-[10px] text-muted-foreground pt-1">
          {total} passage{total !== 1 ? 's' : ''} au total
        </p>
      )}
    </div>
  );
}
