'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { FaceRiskScore } from '@/components/face-risk-score';
import { FacePassageHistory } from '@/components/face-passage-history';
import { LivenessIndicator } from '@/components/liveness-indicator';
import { BlacklistToggle } from '@/components/blacklist-toggle';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import {
  getBastionFace,
  updateBastionFace,
  deleteBastionFace,
  toggleBlacklist,
  type BastionFaceDetail,
  type FacePassage,
} from '@/lib/api';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  AlertTriangle,
  Edit3,
  Trash2,
  Shield,
  ShieldOff,
  Camera,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const faceId = params?.id as string;

  const [face, setFace] = useState<BastionFaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [riskThreshold, setRiskThreshold] = useState<number[]>([85]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const loadFace = useCallback(async () => {
    if (!faceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBastionFace(faceId);
      setFace(data);
      setRiskThreshold([data.riskThreshold ?? 85]);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement du visage");
    } finally {
      setLoading(false);
    }
  }, [faceId]);

  useEffect(() => {
    loadFace();
  }, [loadFace]);

  const handleToggleBlacklist = async () => {
    if (!face) return;
    try {
      const updated = await toggleBlacklist(face.id);
      setFace((prev) => prev ? { ...prev, isBlacklisted: updated.isBlacklisted } : prev);
      toast(
        updated.isBlacklisted
          ? `${face.name} ajouté à la liste noire`
          : `${face.name} retiré de la liste noire`,
        'success',
      );
    } catch (e: any) {
      toast(e.message || 'Échec du basculement', 'error');
      throw e;
    }
  };

  const handleSaveName = async () => {
    if (!face || !editName.trim()) return;
    setSaving(true);
    try {
      await updateBastionFace(face.id, { name: editName.trim() });
      setFace((prev) => prev ? { ...prev, name: editName.trim() } : prev);
      setEditingName(false);
      toast('Nom mis à jour', 'success');
    } catch (e: any) {
      toast(e.message || 'Échec de la mise à jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveThreshold = async () => {
    if (!face) return;
    setSaving(true);
    try {
      await updateBastionFace(face.id, { riskThreshold: riskThreshold[0] });
      setFace((prev) => prev ? { ...prev, riskThreshold: riskThreshold[0] } : prev);
      toast('Seuil mis à jour', 'success');
    } catch (e: any) {
      toast(e.message || 'Échec de la mise à jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFace = async () => {
    if (!face) return;
    setSaving(true);
    try {
      await deleteBastionFace(face.id);
      toast(`Visage supprimé : ${face.name}`, 'success');
      router.push('/visages');
    } catch (e: any) {
      toast(e.message || 'Échec de la suppression', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── Error state ──
  if (error || !face) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-lg font-medium">Erreur de chargement du visage</p>
            <p className="mt-1 text-sm text-muted-foreground">{error || 'Visage introuvable'}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" onClick={loadFace}>
                Réessayer
              </Button>
              <Button variant="outline" onClick={() => router.push('/visages')}>
                Retour
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Recent anti-spoofing events from passages
  const spoofEvents = (face.passages || []).filter(
    (p: FacePassage) => p.livenessScore != null && p.livenessScore < 0.6,
  );

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title={face.name}
          description="Détail du visage et historique des passages"
          action={{
            label: 'Retour',
            icon: ArrowLeft,
            onClick: () => router.push('/visages'),
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Info */}
          <div className="space-y-4">
            {/* Photo card */}
            <GlassCard variant="default" className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-28 w-28 rounded-xl ring-2 ring-border/40 mb-3">
                  <AvatarImage
                    src={`data:image/jpeg;base64,${face.photoBase64}`}
                    alt={face.name}
                  />
                  <AvatarFallback className="rounded-xl bg-muted text-2xl">
                    {face.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {editingName ? (
                  <div className="w-full space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nouveau nom"
                      className="text-center"
                      autoFocus
                    />
                    <div className="flex justify-center gap-2">
                      <Button size="sm" onClick={handleSaveName} disabled={saving}>
                        {saving ? '...' : 'Sauvegarder'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingName(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{face.name}</span>
                    <button
                      onClick={() => {
                        setEditName(face.name);
                        setEditingName(true);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <span className="text-xs text-muted-foreground mt-1">
                  Enrôlé le {new Date(face.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>

                {/* Blacklist badge */}
                {face.isBlacklisted && (
                  <Badge variant="destructive" className="mt-3 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Liste noire — Alerte CRITIQUE
                  </Badge>
                )}
              </div>
            </GlassCard>

            {/* Quick stats */}
            <GlassCard variant="default" className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Score de risque</span>
                  <FaceRiskScore score={face.riskThreshold ?? 85} size="sm" showLabel={false} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Passages</span>
                  <span className="font-mono text-sm tabular-nums">
                    {face._count?.passages ?? 0}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Statut</span>
                  <Badge variant={face.isBlacklisted ? 'destructive' : 'success'} className="text-[10px]">
                    {face.isBlacklisted ? 'Liste noire' : 'Autorisé'}
                  </Badge>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right column — Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Risk score card */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-sm font-semibold mb-4">Score de risque & seuil</h3>
              <div className="flex items-center gap-6">
                <FaceRiskScore score={face.riskThreshold ?? 85} size="lg" />
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Seuil de confiance : {riskThreshold[0]}%
                  </Label>
                  <Slider
                    value={riskThreshold}
                    onValueChange={setRiskThreshold}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Faible</span>
                    <span>Élevé</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={handleSaveThreshold}
                    disabled={saving || riskThreshold[0] === (face.riskThreshold ?? 85)}
                  >
                    {saving ? '...' : 'Appliquer'}
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Blacklist section */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-sm font-semibold mb-4">Liste noire</h3>
              <BlacklistToggle
                faceId={face.id}
                isBlacklisted={face.isBlacklisted}
                faceName={face.name}
                onToggle={handleToggleBlacklist}
              />
            </GlassCard>

            {/* Auto-unlock config */}
            <GlassCard variant="default" className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Déverrouillage auto</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configurer le déverrouillage automatique par reconnaissance faciale
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Configurer le déverrouillage auto
                </Button>
              </div>
            </GlassCard>

            {/* Passage history */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                Historique des passages
              </h3>
              <FacePassageHistory faceId={face.id} />
            </GlassCard>

            {/* Anti-spoofing events */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Événements anti-spoofing
              </h3>
              {spoofEvents.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium">Aucune tentative de fraude</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aucune tentative de spoofing détectée.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {spoofEvents.slice(0, 5).map((event: FacePassage) => (
                    <div key={event.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs">{event.camera?.name}</span>
                      </div>
                      {event.livenessScore != null && (
                        <LivenessIndicator score={event.livenessScore} showScore className="shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Delete section */}
            <GlassCard variant="default" className="p-6 border-destructive/20">
              <h3 className="text-sm font-semibold text-destructive mb-2">Zone dangereuse</h3>
              <p className="text-xs text-muted-foreground mb-4">
                La suppression est irréversible. Le visage sera retiré de la base de reconnaissance faciale.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer le visage
              </Button>

              <ConfirmationDialog
                isOpen={showDeleteConfirm}
                title="Supprimer le visage"
                description={
                  face.isBlacklisted
                    ? `Êtes-vous sûr de vouloir supprimer ${face.name} ? Cette action retire le visage de la base.`
                    : `Êtes-vous sûr de vouloir supprimer ${face.name} ? Cette action retire l'accès si déverrouillage auto est activé.`
                }
                confirmLabel="Supprimer"
                isLoading={saving}
                onConfirm={handleDeleteFace}
                onCancel={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                }}
              />
            </GlassCard>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
