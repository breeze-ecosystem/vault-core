'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/toast';
import {
  Search,
  Radio,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Camera,
  Network,
} from 'lucide-react';
import { startOnvifScan, getOnvifResults, createCamera, type OnvifDevice } from '@/lib/api';

interface OnvifScanPanelProps {
  open: boolean;
  onClose: () => void;
  onCameraAdded?: () => void;
}

type ScanState = 'pre-scan' | 'scanning' | 'results' | 'no-devices' | 'error';

export function OnvifScanPanel({ open, onClose, onCameraAdded }: OnvifScanPanelProps) {
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [scanState, setScanState] = useState<ScanState>('pre-scan');
  const [scanId, setScanId] = useState<string | null>(null);
  const [devices, setDevices] = useState<OnvifDevice[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [scanProgress, setScanProgress] = useState(0);

  // Poll scan results
  useEffect(() => {
    if (scanState !== 'scanning' || !scanId) return;

    const interval = setInterval(async () => {
      try {
        const result = await getOnvifResults(scanId);
        setDevices(result.devices);
        setFoundCount(result.devices.length);
        setScanProgress(Math.min((result.devices.length / 20) * 100, 90));

        if (result.status === 'complete') {
          setScanState(result.devices.length > 0 ? 'results' : 'no-devices');
          setScanProgress(100);
          clearInterval(interval);
        } else if (result.status === 'error') {
          setScanState('error');
          clearInterval(interval);
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [scanState, scanId]);

  const handleStartScan = useCallback(async () => {
    if (!subnet.trim()) return;

    setScanState('scanning');
    setDevices([]);
    setFoundCount(0);
    setScanProgress(10);

    try {
      const result = await startOnvifScan(subnet.trim());
      setScanId(result.scanId);
      if (result.devices) {
        setDevices(result.devices);
        setFoundCount(result.devices.length);
      }
    } catch (e: any) {
      setScanState('error');
      toast(e.message, 'error');
    }
  }, [subnet]);

  const handleAddDevice = useCallback(async (device: OnvifDevice) => {
    setAddingIds((prev) => new Set(prev).add(device.id));
    try {
      await createCamera({
        name: device.model || `Caméra ${device.ip}`,
        rtspUrl: `rtsp://${device.ip}:554/stream1`,
        organizationId: '',
      });
      toast(`Caméra ajoutée : ${device.model || device.ip}`, 'success');
      onCameraAdded?.();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  }, [onCameraAdded]);

  const handleReset = () => {
    setScanState('pre-scan');
    setDevices([]);
    setScanId(null);
    setFoundCount(0);
    setScanProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Découverte de caméras ONVIF
          </DialogTitle>
          <DialogDescription>
            Scannez votre réseau local pour détecter les caméras compatibles ONVIF
          </DialogDescription>
        </DialogHeader>

        {/* ── Pre-scan ────────────────────────────────────────────────── */}
        {scanState === 'pre-scan' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Network className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Plage réseau</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={subnet}
                  onChange={(e) => setSubnet(e.target.value)}
                  placeholder="192.168.1.0/24"
                  className="font-mono text-xs"
                />
                <Button onClick={handleStartScan} className="gap-2 shrink-0">
                  <Search className="h-4 w-4" />
                  Lancer le scan
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Le scan peut prendre jusqu&apos;à 30 secondes selon la taille du réseau
              </p>
            </div>
          </div>
        )}

        {/* ── Scanning ────────────────────────────────────────────────── */}
        {scanState === 'scanning' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-card p-6 text-center">
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                <Radio className="h-8 w-8 text-primary relative z-10" />
              </div>
              <p className="text-sm font-medium">Scan en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {foundCount} caméra{foundCount > 1 ? 's' : ''} trouvée{foundCount > 1 ? 's' : ''}
              </p>
              <Progress value={scanProgress} className="mt-4" />
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────── */}
        {scanState === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {devices.length} appareil{devices.length > 1 ? 's' : ''} trouvé{devices.length > 1 ? 's' : ''}
              </p>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Nouveau scan
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Modèle</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">IP</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Version ONVIF</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Statut</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id} className="border-b border-border transition-colors hover:bg-muted/20">
                      <td className="px-3 py-2.5 text-xs">{device.model || 'Inconnu'}</td>
                      <td className="px-3 py-2.5 text-xs font-mono">{device.ip}</td>
                      <td className="px-3 py-2.5 text-xs">{device.onvifVersion || '—'}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={device.compatible ? 'success' : 'secondary'} className="text-[10px]">
                          {device.compatible ? 'Compatible' : 'Non compatible'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {device.compatible && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => handleAddDevice(device)}
                            disabled={addingIds.has(device.id)}
                          >
                            {addingIds.has(device.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            {addingIds.has(device.id) ? 'Ajout...' : 'Ajouter'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── No devices found ────────────────────────────────────────── */}
        {scanState === 'no-devices' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
                <Camera className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium">Aucun appareil ONVIF détecté</p>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>• Vérifiez que les caméras sont allumées et connectées au réseau</p>
                <p>• Assurez-vous que l&apos;ONVIF est activé dans les paramètres des caméras</p>
                <p>• Vérifiez que le sous-réseau est correct ({subnet})</p>
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {scanState === 'error' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">Erreur de scan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Le scan n&apos;a pas pu être effectué. Vérifiez que le service ONVIF est actif.
              </p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={handleReset}>
                <RefreshCw className="h-3.5 w-3.5" />
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
