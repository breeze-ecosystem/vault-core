'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AccessScheduleGrid } from '@/components/access-schedule-grid';
import {
  getAccessSchedules,
  createAccessSchedule,
  type ScheduleDto,
  type ScheduleEntry,
} from '@/lib/api';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Plus,
  Clock,
  Loader2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

export default function AccessSchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleEntries, setNewScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [creating, setCreating] = useState(false);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAccessSchedules({ page: 1, limit: 100 });
      setSchedules(result.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) return;
    setCreating(true);
    try {
      await createAccessSchedule({
        name: newScheduleName.trim(),
        entries: newScheduleEntries,
      });
      toast('Horaire créé avec succès', 'success');
      setShowCreateDialog(false);
      setNewScheduleName('');
      setNewScheduleEntries([]);
      loadSchedules();
    } catch (e: any) {
      toast(e.message || "Échec de création de l'horaire", 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Horaires d'accès"
          description="Programmez les plages horaires d'accès par jour"
          action={{
            label: 'Retour',
            icon: ArrowLeft,
            onClick: () => router.push('/acces'),
          }}
        />

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-destructive mb-1">Erreur de chargement</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={loadSchedules}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && schedules.length === 0 && (
          <GlassCard variant="default" className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
                <Clock className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium">Aucun horaire configuré</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Programmez les plages horaires d&apos;accès par jour.
              </p>
              <Button
                variant="default"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Configurer un horaire
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Schedule list */}
        {!loading && !error && schedules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {schedules.length} horaire{schedules.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" className="gap-2" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" />
                Configurer un horaire
              </Button>
            </div>

            {schedules.map((schedule) => (
              <GlassCard key={schedule.id} variant="default" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">{schedule.name}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {schedule.entries.length} plage{schedule.entries.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <AccessScheduleGrid
                  value={schedule.entries}
                  onChange={() => {}}
                  readOnly
                />
              </GlassCard>
            ))}
          </div>
        )}

        {/* Create dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <GlassCard variant="default" className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Configurer un horaire</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="schedule-name" className="text-xs text-muted-foreground">
                    Nom de l&apos;horaire
                  </Label>
                  <Input
                    id="schedule-name"
                    value={newScheduleName}
                    onChange={(e) => setNewScheduleName(e.target.value)}
                    placeholder="Ex: Horaires de bureau"
                    className="mt-1"
                  />
                </div>

                <AccessScheduleGrid
                  value={newScheduleEntries}
                  onChange={setNewScheduleEntries}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setNewScheduleName('');
                      setNewScheduleEntries([]);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateSchedule}
                    disabled={creating || !newScheduleName.trim()}
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    {creating ? 'Création...' : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
