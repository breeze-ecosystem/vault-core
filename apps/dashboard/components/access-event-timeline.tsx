'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CorrelatedSnapshot } from '@/components/correlated-snapshot';
import { getAccessEvents, type AccessEvent } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Clock,
  DoorOpen,
  User,
  ImageOff,
  Play,
  Shield,
  Filter,
  Loader2,
} from 'lucide-react';

interface AccessEventTimelineProps {
  credentialId?: string;
  className?: string;
}

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'granted', label: 'Accès autorisé' },
  { value: 'denied', label: 'Accès refusé' },
  { value: 'forced', label: 'Accès forcé' },
  { value: 'held_open', label: 'Porte forcée' },
];

const EVENT_COLORS: Record<string, string> = {
  granted: 'bg-success',
  denied: 'bg-destructive',
  forced: 'bg-destructive',
  held_open: 'bg-warning',
};

export function AccessEventTimeline({
  credentialId,
  className,
}: AccessEventTimelineProps) {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AccessEvent | null>(null);

  const loadEvents = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await getAccessEvents({
        page: pageNum,
        limit: 20,
        type: typeFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      if (append) {
        setEvents((prev) => [...prev, ...result.data]);
      } else {
        setEvents(result.data);
      }
      setTotal(result.total);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadEvents(1);
  }, [loadEvents]);

  const handleLoadMore = () => {
    loadEvents(page + 1, true);
  };

  const handleFilter = () => {
    setEvents([]);
    loadEvents(1);
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
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
          <Shield className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium">Erreur de chargement</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => loadEvents(1)}>
            Réessayer
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-muted/10 border border-border">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm h-9"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Du</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Au</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        <Button size="sm" onClick={handleFilter} className="gap-2 h-9">
          <Filter className="h-3.5 w-3.5" />
          Filtrer
        </Button>
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <GlassCard variant="default" className="flex items-center justify-center py-12">
          <div className="text-center">
            <Shield className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium">Aucun événement d&apos;accès</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aucun accès refusé ou forcé pour la période sélectionnée.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border/50" />
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 relative">
                {/* Event dot */}
                <div
                  className={cn(
                    'h-3 w-3 rounded-full mt-1.5 shrink-0 ring-2 ring-background z-10',
                    EVENT_COLORS[event.decision] || 'bg-muted-foreground/40',
                  )}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {event.decision === 'granted'
                        ? 'Accès autorisé'
                        : event.decision === 'denied'
                          ? 'Accès refusé'
                          : event.decision === 'forced'
                            ? 'Accès forcé'
                            : 'Porte forcée'}
                    </span>
                    <Badge
                      variant={event.decision === 'granted' ? 'success' : 'destructive'}
                      className="text-[10px]"
                    >
                      {event.decision}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DoorOpen className="h-3 w-3" />
                      {event.door?.name || 'Porte inconnue'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {event.user
                        ? `${event.user.firstName} ${event.user.lastName}`
                        : event.credential?.badgeNumber || 'Inconnu'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(event.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Credential info */}
                  {event.credential && (
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {event.credential.type} — {event.credential.badgeNumber || ''}
                    </span>
                  )}

                  {/* Risk score */}
                  {(event as any).riskScore != null && (
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5 block">
                      Score: {(event as any).riskScore}%
                    </span>
                  )}
                </div>

                {/* Snapshot thumbnail + video button */}
                <div className="flex items-start gap-2 shrink-0">
                  {event.snapshotUrl ? (
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="h-14 w-14 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                    >
                      <img
                        src={event.snapshotUrl}
                        alt="Snapshot"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted/30 flex items-center justify-center">
                      <ImageOff className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}

                  {event.videoClipUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1 px-2"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Play className="h-3 w-3" />
                      Voir la vidéo 10s
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Load more */}
      {events.length > 0 && events.length < total && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                Chargement...
              </>
            ) : (
              'Charger plus'
            )}
          </Button>
        </div>
      )}

      {/* Total count */}
      {events.length > 0 && events.length >= total && total > 20 && (
        <p className="text-center text-[10px] text-muted-foreground">
          {total} événement{total !== 1 ? 's' : ''} au total
        </p>
      )}

      {/* Correlated snapshot dialog */}
      {selectedEvent && (
        <CorrelatedSnapshot
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          snapshotUrl={selectedEvent.snapshotUrl}
          videoClipUrl={selectedEvent.videoClipUrl}
          event={selectedEvent}
        />
      )}
    </div>
  );
}
