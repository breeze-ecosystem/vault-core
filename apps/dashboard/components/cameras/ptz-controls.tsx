'use client';

import { useState, useRef, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  StopCircle,
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface PTZPreset {
  token: string;
  name: string;
  snapshotUrl: string | null;
}

interface PTZControlsProps {
  cameraId: string;
  hasPtz: boolean;
  presets?: PTZPreset[];
  userRole: string;
  onMove: (pan: number, tilt: number, zoom: number) => void;
  onStop: () => void;
  onGotoPreset: (presetToken: string) => void;
  onSavePreset: (name: string) => void;
  disabled?: boolean;
}

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SUPERVISOR'];

const btnClass =
  'w-11 h-11 flex items-center justify-center rounded-lg bg-background/80 hover:bg-primary/20 backdrop-blur-sm transition-colors';

export function PTZControls({
  hasPtz,
  presets,
  userRole,
  onMove,
  onStop,
  onGotoPreset,
  onSavePreset,
  disabled,
}: PTZControlsProps) {
  // Role gate (D-16): hide if role < SUPERVISOR or no PTZ
  const canControl = ALLOWED_ROLES.includes(userRole);
  if (!canControl || !hasPtz) return null;

  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const lastCommandRef = useRef(0);

  const handleMove = useCallback(
    (pan: number, tilt: number, zoom: number) => {
      if (disabled) return;

      // Client-side rate limiting: max 5 commands/second (200ms gap)
      const now = Date.now();
      if (now - lastCommandRef.current < 200) return;
      lastCommandRef.current = now;

      onMove(pan, tilt, zoom);
    },
    [disabled, onMove],
  );

  const handleStop = useCallback(() => {
    if (disabled) return;
    onStop();
  }, [disabled, onStop]);

  const handleSavePreset = useCallback(() => {
    const name = prompt('Nom du preset');
    if (name) onSavePreset(name);
  }, [onSavePreset]);

  return (
    <>
      {/* ── Directional Pad ──────────────────────────────────────────── */}
      <div className="absolute bottom-20 left-4 flex flex-col items-center gap-1">
        {/* Top: ArrowUp */}
        <button
          className={btnClass}
          onMouseDown={() => handleMove(0, -1, 0)}
          onMouseUp={handleStop}
          onMouseLeave={handleStop}
          aria-label="Pan up"
        >
          <ArrowUp className="h-5 w-5" />
        </button>

        {/* Middle row: Left + Stop + Right */}
        <div className="flex items-center gap-1">
          <button
            className={btnClass}
            onMouseDown={() => handleMove(-1, 0, 0)}
            onMouseUp={handleStop}
            onMouseLeave={handleStop}
            aria-label="Pan left"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-destructive/20 hover:bg-destructive/30 backdrop-blur-sm transition-colors"
            onMouseDown={handleStop}
            aria-label="Stop PTZ"
          >
            <StopCircle className="h-5 w-5 text-destructive" />
          </button>
          <button
            className={btnClass}
            onMouseDown={() => handleMove(1, 0, 0)}
            onMouseUp={handleStop}
            onMouseLeave={handleStop}
            aria-label="Pan right"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom: ArrowDown */}
        <button
          className={btnClass}
          onMouseDown={() => handleMove(0, 1, 0)}
          onMouseUp={handleStop}
          onMouseLeave={handleStop}
          aria-label="Pan down"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      </div>

      {/* ── Zoom Slider ──────────────────────────────────────────────── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <button
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-background/80 hover:bg-primary/20 backdrop-blur-sm transition-colors"
          onMouseDown={() => handleMove(0, 0, 1)}
          onMouseUp={handleStop}
          onMouseLeave={handleStop}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <div className="w-1 h-24 rounded-full bg-background/40">
          <div
            className="w-full bg-primary/60 rounded-full"
            style={{ height: '50%' }}
          />
        </div>
        <button
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-background/80 hover:bg-primary/20 backdrop-blur-sm transition-colors"
          onMouseDown={() => handleMove(0, 0, -1)}
          onMouseUp={handleStop}
          onMouseLeave={handleStop}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
      </div>

      {/* ── Preset Thumbnail Bar ─────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
        <button
          onClick={() => setPresetsExpanded(!presetsExpanded)}
          className="flex items-center gap-1 text-xs text-white/70 mb-1"
        >
          {presetsExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
          {presets?.length || 0} présents
        </button>

        {presetsExpanded && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {presets?.map((p) => (
              <button
                key={p.token}
                onClick={() => onGotoPreset(p.token)}
                className="flex-shrink-0 w-16 h-12 rounded border border-white/10 bg-black/40 hover:border-primary/50 transition-colors overflow-hidden"
              >
                {p.snapshotUrl ? (
                  <img
                    src={p.snapshotUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-white/60">
                    {p.name}
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={handleSavePreset}
              className="flex-shrink-0 w-16 h-12 rounded border border-dashed border-white/20 flex items-center justify-center hover:border-primary/50 transition-colors"
            >
              <Plus className="h-4 w-4 text-white/60" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
