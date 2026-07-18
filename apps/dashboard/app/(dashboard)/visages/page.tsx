'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FaceUploadDropzone } from '@/components/face-upload-dropzone';
import { FaceRecognitionBadge } from '@/components/face-recognition-badge';
import { FaceGrid } from '@/components/face-grid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Users,
  UserX,
  Shield,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import {
  getFaces,
  addFace,
  deleteFace,
  getBastionFaces,
  type FaceEntry,
  type BastionFaceEntry,
} from '@/lib/api';

const MAX_FACES = 50;

export default function VisagesPage() {
  const router = useRouter();
  const [faces, setFaces] = useState<FaceEntry[]>([]);
  const [bastionFaces, setBastionFaces] = useState<BastionFaceEntry[]>([]);
  const [bastionTotal, setBastionTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FaceEntry | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isBastion, setIsBastion] = useState<boolean | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Try BASTION API first — if it works, we're in BASTION mode
    getBastionFaces({ page: 1, limit: 100 })
      .then((result) => {
        setIsBastion(true);
        setBastionFaces(result.data);
        setBastionTotal(result.total);
        setLoading(false);
      })
      .catch(() => {
        // BASTION not available — fall back to VISION faces
        setIsBastion(false);
        return getFaces()
          .then(setFaces)
          .catch((e) => setError(e.message))
          .finally(() => setLoading(false));
      });
  }, [refreshKey]);

  const filteredFaces = useMemo(() => {
    if (!searchQuery) return faces;
    const q = searchQuery.toLowerCase();
    return faces.filter((f) => f.name.toLowerCase().includes(q));
  }, [faces, searchQuery]);

  const handleFileSelected = async (file: File) => {
    // Will be handled when user clicks "Ajouter ce visage" in the upload dialog
  };

  const handleAddFace = async (name: string, file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await addFace({ name, photoBase64: base64 });
      toast('Visage ajouté avec succès', 'success');
      setShowUpload(false);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message || "Erreur lors de l'ajout du visage", 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFace = async (face: FaceEntry) => {
    try {
      await deleteFace(face.id);
      toast(`Visage supprimé : ${face.name}`, 'success');
      setDeleteConfirm(null);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const limitReached = faces.length >= MAX_FACES;

  // ── Loading state ──
  if (loading && isBastion === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── BASTION mode ──
  if (isBastion === true) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <PageHeader
            title="Visages — Reconnaissance faciale"
            description={`${bastionTotal} visage${bastionTotal !== 1 ? 's' : ''} — BASTION illimité`}
            action={{
              label: 'Enrôler un visage',
              icon: Plus,
              onClick: () => router.push('/visages/nouveau'),
            }}
          />

          {/* BASTION badge */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary/80">
              Reconnaissance faciale illimitée — pack BASTION
            </span>
          </div>

          {/* Search + filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* BASTION face grid */}
          <FaceGrid
            faces={bastionFaces}
            loading={loading}
            error={error}
            onRetry={() => setRefreshKey((k) => k + 1)}
            onAddFace={() => router.push('/visages/nouveau')}
            total={bastionTotal}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </PageTransition>
    );
  }

  // ── Error state (VISION fallback only) ──
  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-lg font-medium">Erreur de chargement</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => setRefreshKey((k) => k + 1)}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // ── VISION mode (default) ──
  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Reconnaissance faciale"
          description={`${faces.length}/${MAX_FACES} visages`}
          action={{
            label: limitReached ? 'Limite atteinte' : 'Ajouter un visage',
            icon: Plus,
            onClick: () => {
              if (limitReached) {
                toast('Limite de 50 visages atteinte. Passez à BASTION.', 'info');
              } else {
                setShowUpload(true);
              }
            },
          }}
        />

        {/* Limit banner */}
        {limitReached && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-warning flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Limite de {MAX_FACES} visages atteinte. Passez à BASTION pour débloquer la reconnaissance illimitée.</span>
          </div>
        )}

        {/* Search */}
        {faces.length > 0 && (
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && faces.length === 0 && (
          <GlassCard variant="default" className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
                <Users className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium">Aucun visage enregistré</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajoutez des visages à la liste blanche pour activer la reconnaissance
              </p>
              <Button variant="default" size="sm" className="mt-4 gap-2" onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4" />
                Ajouter un visage
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Face grid (VISION) */}
        {filteredFaces.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredFaces.map((face) => (
              <GlassCard key={face.id} variant="default" className="p-3">
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

                  <FaceRecognitionBadge
                    status={face.status}
                    className="mt-1.5"
                  />

                  {face.lastSeenAt && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Vu le {new Date(face.lastSeenAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteConfirm(face)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Filtered empty */}
        {!loading && faces.length > 0 && filteredFaces.length === 0 && (
          <div className="text-center py-8">
            <UserX className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Aucun résultat pour &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un visage</DialogTitle>
            <DialogDescription>
              Téléchargez une photo pour ajouter un visage à la liste blanche
            </DialogDescription>
          </DialogHeader>
          <FaceUploadDropzone
            onFileSelected={handleFileSelected}
            currentCount={faces.length}
            maxCount={MAX_FACES}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer un visage</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {deleteConfirm?.name} de la liste blanche ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteFace(deleteConfirm)}
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
