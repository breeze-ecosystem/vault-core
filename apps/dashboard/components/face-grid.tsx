'use client';

import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { FaceRiskScore } from '@/components/face-risk-score';
import { Search, Users, UserX, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import type { BastionFaceEntry } from '@/lib/api';

interface FaceGridProps {
  faces: BastionFaceEntry[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAddFace?: () => void;
  total?: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FaceGrid({
  faces,
  loading,
  error,
  onRetry,
  onAddFace,
  total,
  searchQuery,
  onSearchChange,
}: FaceGridProps) {
  const router = useRouter();

  const { normalFaces, blacklistedFaces } = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = faces.filter((f) => f.name.toLowerCase().includes(q));
    return {
      normalFaces: filtered.filter((f) => !f.isBlacklisted),
      blacklistedFaces: filtered.filter((f) => f.isBlacklisted),
    };
  }, [faces, searchQuery]);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-20 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium">Erreur de chargement</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
              Réessayer
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (faces.length === 0) {
    return (
      <GlassCard variant="default" className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
            <Users className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">Aucun visage enregistré</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aucun visage dans la base. Enrôlez des visages pour activer la reconnaissance faciale illimitée.
          </p>
          {onAddFace && (
            <Button variant="default" size="sm" className="mt-4" onClick={onAddFace}>
              Enrôler un visage
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search + count */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {total !== undefined && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {total} visage{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtered empty state */}
      {normalFaces.length === 0 && blacklistedFaces.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <UserX className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucun résultat pour &quot;{searchQuery}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Normal faces */}
      {normalFaces.length > 0 && (
        <div>
          {blacklistedFaces.length > 0 && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Visages autorisés ({normalFaces.length})
            </h3>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {normalFaces.map((face) => (
              <GlassCard
                key={face.id}
                variant="default"
                className="p-3 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => router.push(`/visages/${face.id}`)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-2">
                    <Avatar className="h-20 w-20 rounded-xl ring-2 ring-border/40">
                      <AvatarImage
                        src={`data:image/jpeg;base64,${face.photoBase64}`}
                        alt={face.name}
                      />
                      <AvatarFallback className="rounded-xl bg-muted">
                        {face.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <p className="text-sm font-medium truncate max-w-full">{face.name}</p>

                  {/* Risk score gauge */}
                  {face.riskThreshold != null && (
                    <div className="w-full mt-2">
                      <FaceRiskScore score={face.riskThreshold} size="sm" showLabel={false} inline />
                    </div>
                  )}

                  {/* Passage count */}
                  {face._count?.passages != null && (
                    <span className="text-[10px] text-muted-foreground mt-1.5">
                      {face._count.passages} passage{face._count.passages !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Blacklisted faces */}
      {blacklistedFaces.length > 0 && (
        <div>
          <h3 className={cn(
            'text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2',
            'text-destructive',
          )}>
            <AlertTriangle className="h-3 w-3" />
            Liste noire ({blacklistedFaces.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {blacklistedFaces.map((face) => (
              <GlassCard
                key={face.id}
                variant="default"
                className="p-3 cursor-pointer hover:border-destructive/50 transition-colors border-destructive/30"
                onClick={() => router.push(`/visages/${face.id}`)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-2">
                    <Avatar className="h-20 w-20 rounded-xl ring-2 ring-destructive/40">
                      <AvatarImage
                        src={`data:image/jpeg;base64,${face.photoBase64}`}
                        alt={face.name}
                      />
                      <AvatarFallback className="rounded-xl bg-muted">
                        {face.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 px-1.5 text-[9px]"
                    >
                      Liste noire
                    </Badge>
                  </div>

                  <p className="text-sm font-medium truncate max-w-full">{face.name}</p>

                  {face._count?.passages != null && (
                    <span className="text-[10px] text-muted-foreground mt-1.5">
                      {face._count.passages} passage{face._count.passages !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
