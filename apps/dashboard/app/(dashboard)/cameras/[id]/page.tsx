'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchCameras,
  fetchAlerts,
  type Camera,
  type Alert,
} from '@/lib/api';
import VideoPlayer from '@/components/video-player';
import Link from 'next/link';
import {
  ArrowLeft,
  Map,
  Activity,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

export default function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [substreamQuality, setSubstreamQuality] = useState<'hd' | 'sd'>('hd');

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCameras({ limit: 1 }).then((r) => {
        const cam = r.data.find((c) => c.id === id);
        if (!cam) throw new Error('Caméra non trouvée');
        return cam;
      }),
      fetchAlerts({ cameraId: id, limit: 5 }),
    ])
      .then(([cam, alertsRes]) => {
        setCamera(cam);
        setRecentAlerts(alertsRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubstreamToggle = () => {
    setSubstreamQuality((prev) => (prev === 'hd' ? 'sd' : 'hd'));
    toast(`Qualité ${substreamQuality === 'hd' ? 'SD' : 'HD'}`, 'success');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 col-span-2 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
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
          <Button variant="outline" className="mt-4" onClick={() => router.push('/cameras')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux caméras
          </Button>
        </div>
      </div>
    );
  }

  const isOnline = camera.status === 'ONLINE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={camera.name}
        description={
          <span className="flex items-center gap-2">
            <Badge variant={isOnline ? 'success' : 'destructive'}>
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500 status-pulse' : 'bg-red-500'}`} />
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Badge>
            {camera.resolution && (
              <span className="text-xs text-muted-foreground">{camera.resolution}</span>
            )}
          </span>
        }
        action={{
          label: 'Paramètres',
          icon: Settings,
          onClick: () => router.push(`/cameras/${id}/zones`),
        }}
      />

      {/* Full-width video player */}
      <GlassCard variant="default" className="overflow-hidden p-0">
        <div className="aspect-video w-full">
          <VideoPlayer
            cameraId={camera.id}
            cameraName={camera.name}
            streamUrl={camera.rtspUrl}
            showRecordingIndicator
            recordingActive={camera.isRecording}
            onSubstreamToggle={handleSubstreamToggle}
            substreamQuality={substreamQuality}
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: camera info + detection settings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Detection zones */}
          <GlassCard variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Zones de détection</h3>
              </div>
              <Link href={`/cameras/${id}/zones`}>
                <Button size="sm" variant="outline" className="gap-2">
                  <Map className="h-3.5 w-3.5" />
                  Configurer
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Définissez des zones d&apos;intérêt pour la détection de mouvement sur cette caméra
            </p>
          </GlassCard>

          {/* Recent alerts */}
          <GlassCard variant="default" className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Alertes récentes</h3>
              </div>
            </div>
            {recentAlerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune alerte récente</p>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${
                        alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                          ? 'text-destructive'
                          : 'text-warning'
                      }`} />
                      <span className="text-xs truncate">{alert.title}</span>
                    </div>
                    <Badge variant={
                      alert.severity === 'CRITICAL' ? 'destructive' :
                      alert.severity === 'HIGH' ? 'warning' : 'secondary'
                    } className="text-[10px] shrink-0 ml-2">
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: camera info panel */}
        <div className="space-y-4">
          <GlassCard variant="default" className="p-4">
            <h3 className="text-sm font-semibold mb-3">Informations</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Statut</span>
                <Badge variant={isOnline ? 'success' : 'destructive'} className="text-[10px]">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Résolution</span>
                <span className="text-xs font-mono">{camera.resolution || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">FPS</span>
                <span className="text-xs font-mono">{camera.fps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Enregistrement</span>
                <Badge variant={camera.isRecording ? 'success' : 'secondary'} className="text-[10px]">
                  {camera.isRecording ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              {camera.lastHeartbeat && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Dernier heartbeat</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(camera.lastHeartbeat).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard variant="default" className="p-4">
            <h3 className="text-sm font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <Link href={`/cameras/${id}/zones`}>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Map className="h-3.5 w-3.5" />
                  Zones de détection
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
