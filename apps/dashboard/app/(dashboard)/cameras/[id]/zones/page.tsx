'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { DetectionZoneCanvas } from '@/components/detection-zone-canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { fetchCameras, type Camera } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import type { DetectionZone } from '@/lib/api';

export default function DetectionZonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCameras({ limit: 1 })
      .then((r) => {
        const cam = r.data.find((c) => c.id === id);
        if (!cam) throw new Error('Caméra non trouvée');
        setCamera(cam);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveZones = (zones: any[]) => {
    toast('Zones enregistrées', 'success');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video w-full rounded-lg" />
      </div>
    );
  }

  if (error || !camera) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-lg font-medium">Caméra non trouvée</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title={`Zones de détection — ${camera.name}`}
          description="Définissez les zones d'intérêt pour la détection de mouvement"
        />

        <DetectionZoneCanvas
          cameraId={camera.id}
          snapshotUrl={camera.lastSnapshotUrl}
          zones={[]}
          onSave={handleSaveZones}
        />
      </div>
    </PageTransition>
  );
}
