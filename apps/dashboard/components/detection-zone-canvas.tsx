'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SensitivitySlider } from '@/components/sensitivity-slider';
import { cn } from '@/lib/utils';
import {
  Square,
  Pentagon,
  Trash2,
  Plus,
  EyeOff,
  Eye,
  Move,
} from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  type: 'rectangle' | 'polygon';
  coordinates: number[][];
  isActive: boolean;
  sensitivity?: number;
}

interface DetectionZoneCanvasProps {
  cameraId: string;
  snapshotUrl?: string | null;
  zones: Zone[];
  onSave: (zones: Zone[]) => void;
  loading?: boolean;
}

type DrawingMode = 'rectangle' | 'polygon' | 'none';

export function DetectionZoneCanvas({
  cameraId,
  snapshotUrl,
  zones,
  onSave,
  loading = false,
}: DetectionZoneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [currentZoneName, setCurrentZoneName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [localZones, setLocalZones] = useState<Zone[]>(zones);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [globalSensitivity, setGlobalSensitivity] = useState(50);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<number[][]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const imageLoaded = useRef(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Sync zones prop
  useEffect(() => {
    setLocalZones(zones);
  }, [zones]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const container = containerRef.current;
    if (!container) return;

    // Match container dimensions
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw snapshot as background
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      // Grid placeholder when no snapshot
      ctx.fillStyle = 'hsl(228 20% 4%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'hsl(228 16% 16%)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw existing zones
    localZones.forEach((zone) => {
      if (zone.coordinates.length < 2) return;
      const isSelected = zone.id === selectedZoneId;
      const color = zone.isActive
        ? isSelected ? 'rgba(6, 182, 212, 0.5)' : 'rgba(6, 182, 212, 0.25)'
        : isSelected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.2)';
      const borderColor = zone.isActive
        ? isSelected ? '#06b6d4' : '#06b6d480'
        : isSelected ? '#f59e0b' : '#f59e0b80';

      ctx.fillStyle = color;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      if (zone.type === 'rectangle' && zone.coordinates.length >= 2) {
        const p1 = zone.coordinates[0]!;
        const p2 = zone.coordinates[1]!;
        const x = Math.min(p1[0]!, p2[0]!);
        const y = Math.min(p1[1]!, p2[1]!);
        const w = Math.abs(p2[0]! - p1[0]!);
        const h = Math.abs(p2[1]! - p1[1]!);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (zone.type === 'polygon' && zone.coordinates.length >= 3) {
        ctx.beginPath();
        const firstCoord = zone.coordinates[0]!;
        ctx.moveTo(firstCoord[0]!, firstCoord[1]!);
        for (let i = 1; i < zone.coordinates.length; i++) {
          const coord = zone.coordinates[i]!;
          ctx.lineTo(coord[0]!, coord[1]!);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Zone name label
      const firstCoord = zone.coordinates[0]!;
      const labelX = firstCoord[0]!;
      const labelY = firstCoord[1]! - 8;
      ctx.fillStyle = zone.isActive ? '#06b6d4' : '#f59e0b';
      ctx.font = '11px sans-serif';
      ctx.fillText(zone.name, labelX, labelY);
    });

    // Draw in-progress shape
    if (drawingMode === 'rectangle' && startPos && mousePos) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(
        Math.min(startPos.x, mousePos.x),
        Math.min(startPos.y, mousePos.y),
        Math.abs(mousePos.x - startPos.x),
        Math.abs(mousePos.y - startPos.y),
      );
      ctx.setLineDash([]);
    }

    if (drawingMode === 'polygon' && polygonPoints.length > 0) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      const firstPt = polygonPoints[0]!;
      ctx.moveTo(firstPt[0]!, firstPt[1]!);
      for (let i = 1; i < polygonPoints.length; i++) {
        const pt = polygonPoints[i]!;
        ctx.lineTo(pt[0]!, pt[1]!);
      }
      if (mousePos) {
        ctx.lineTo(mousePos.x, mousePos.y);
      }
      ctx.stroke();

      // Draw vertices
      polygonPoints.forEach((pt) => {
        const px = pt[0]!;
        const py = pt[1]!;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
      });

      ctx.setLineDash([]);
    }
  }, [localZones, selectedZoneId, drawingMode, startPos, mousePos, polygonPoints]);

  // Redraw on any change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ── Mouse handlers ──────────────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'none') {
      // Select zone
      const pos = getCanvasPos(e);
      const clicked = localZones.find((z) => {
        // Simple hit test - check if point is inside zone bounding box
        if (!z.coordinates.length) return false;
        const xs = z.coordinates.map((c) => c[0]!);
        const ys = z.coordinates.map((c) => c[1]!);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      });
      setSelectedZoneId(clicked?.id ?? null);
      return;
    }

    const pos = getCanvasPos(e);

    if (drawingMode === 'rectangle') {
      setIsDrawing(true);
      setStartPos(pos);
    } else if (drawingMode === 'polygon') {
      setPolygonPoints((prev) => [...prev, [pos.x, pos.y]]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setMousePos(pos);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'rectangle' && isDrawing && startPos) {
      const pos = getCanvasPos(e);
      const newZone: Zone = {
        id: `temp-${Date.now()}`,
        name: `Zone ${localZones.length + 1}`,
        type: 'rectangle',
        coordinates: [
          [Math.min(startPos.x, pos.x), Math.min(startPos.y, pos.y)],
          [Math.max(startPos.x, pos.x), Math.max(startPos.y, pos.y)],
        ],
        isActive: true,
      };
      setLocalZones((prev) => [...prev, newZone]);
      setShowNameInput(true);
      setCurrentZoneName(`Zone ${localZones.length + 1}`);
      setIsDrawing(false);
      setStartPos(null);
      setDrawingMode('none');
    }
  };

  const handleDoubleClick = () => {
    if (drawingMode === 'polygon' && polygonPoints.length >= 3) {
      const newZone: Zone = {
        id: `temp-${Date.now()}`,
        name: `Zone ${localZones.length + 1}`,
        type: 'polygon',
        coordinates: [...polygonPoints],
        isActive: true,
      };
      setLocalZones((prev) => [...prev, newZone]);
      setShowNameInput(true);
      setCurrentZoneName(`Zone ${localZones.length + 1}`);
      setPolygonPoints([]);
      setDrawingMode('none');
    }
  };

  // ── Zone management ──────────────────────────────────────────────────
  const toggleZoneActive = (zoneId: string) => {
    setLocalZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, isActive: !z.isActive } : z)),
    );
  };

  const removeZone = (zoneId: string) => {
    setLocalZones((prev) => prev.filter((z) => z.id !== zoneId));
    if (selectedZoneId === zoneId) setSelectedZoneId(null);
  };

  const clearAllZones = () => {
    setLocalZones([]);
    setSelectedZoneId(null);
  };

  const confirmZoneName = () => {
    if (currentZoneName.trim()) {
      setLocalZones((prev) =>
        prev.map((z, i) => {
          if (i === prev.length - 1) {
            return { ...z, name: currentZoneName.trim() };
          }
          return z;
        }),
      );
    }
    setShowNameInput(false);
  };

  const handleSave = () => {
    // Clean up temp IDs before saving
    const cleanZones = localZones.map((z) => ({
      ...z,
      id: z.id.startsWith('temp-') ? '' : z.id,
    }));
    onSave(
      cleanZones.map((z, i) => ({
        ...z,
        id: z.id || `zone-${i}-${Date.now()}`,
      })),
    );
  };

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div
        ref={containerRef}
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-lg border border-border',
          drawingMode !== 'none' && 'ring-2 ring-primary/30',
        )}
      >
        {/* Hidden image for snapshot loading */}
        {snapshotUrl && (
          <img
            ref={(el) => {
              if (el) {
                imageRef.current = el;
                imageLoaded.current = true;
                drawCanvas();
              }
            }}
            src={snapshotUrl}
            alt=""
            className="hidden"
            onLoad={() => {
              imageLoaded.current = true;
              drawCanvas();
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ cursor: drawingMode !== 'none' ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />

        {/* Drawing toolbar overlay */}
        {drawingMode === 'none' && (
          <div className="absolute top-2 left-2 flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0 backdrop-blur-sm"
              onClick={() => setDrawingMode('rectangle')}
              title="Rectangle"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0 backdrop-blur-sm"
              onClick={() => setDrawingMode('polygon')}
              title="Polygone"
            >
              <Pentagon className="h-3.5 w-3.5" />
            </Button>
            {localZones.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 p-0 backdrop-blur-sm text-destructive"
                onClick={clearAllZones}
                title="Tout effacer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Drawing mode indicator */}
        {drawingMode !== 'none' && (
          <div className="absolute top-2 left-2 rounded bg-primary/80 px-2 py-1 text-[11px] text-white font-medium backdrop-blur-sm">
            {drawingMode === 'rectangle'
              ? 'Cliquez-déplacez pour dessiner un rectangle'
              : 'Cliquez pour placer les points. Double-cliquez pour fermer.'}
          </div>
        )}

        {/* No zones overlay */}
        {localZones.length === 0 && drawingMode === 'none' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground/50">
                + Ajouter une zone
              </p>
            </div>
          </div>
        )}

        {/* Drawing tools active state */}
        {drawingMode === 'polygon' && polygonPoints.length > 0 && (
          <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[10px] text-white">
            {polygonPoints.length} point{polygonPoints.length > 1 ? 's' : ''} — Double-cliquez pour fermer
          </div>
        )}
      </div>

      {/* Zone list and sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Zone list */}
        <GlassCard variant="default" className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold">Zones ({localZones.length})</h4>
            {showNameInput && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={currentZoneName}
                  onChange={(e) => setCurrentZoneName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmZoneName()}
                  placeholder="Nom de la zone"
                  className="h-6 w-32 rounded border border-input bg-background px-2 text-[11px]"
                  autoFocus
                />
                <Button size="sm" variant="default" className="h-6 text-[10px] px-2" onClick={confirmZoneName}>
                  OK
                </Button>
              </div>
            )}
          </div>
          {localZones.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Aucune zone définie. Utilisez les outils de dessin ci-dessus.
            </p>
          ) : (
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {localZones.map((zone) => (
                  <div
                    key={zone.id}
                    className={cn(
                      'flex items-center justify-between rounded-md px-2 py-1.5 transition-colors',
                      selectedZoneId === zone.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'border border-transparent hover:bg-muted/30',
                    )}
                    onClick={() => setSelectedZoneId(zone.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={zone.isActive ? 'success' : 'secondary'}
                        className="h-1.5 w-1.5 rounded-full p-0"
                      />
                      <span className="text-xs truncate">{zone.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {zone.type === 'rectangle' ? 'Rect' : 'Poly'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleZoneActive(zone.id); }}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        title={zone.isActive ? 'Désactiver' : 'Activer'}
                      >
                        {zone.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeZone(zone.id); }}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </GlassCard>

        {/* Sensitivity */}
        <GlassCard variant="default" className="p-3">
          <h4 className="text-xs font-semibold mb-2">Sensibilité de détection</h4>
          <SensitivitySlider
            value={globalSensitivity}
            onChange={setGlobalSensitivity}
          />
        </GlassCard>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="sm">
          Enregistrer les zones
        </Button>
      </div>
    </div>
  );
}
