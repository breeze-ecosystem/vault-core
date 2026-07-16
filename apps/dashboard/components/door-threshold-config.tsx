"use client";

import { useState, useCallback } from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { updateDoorThresholds, fetchDoorThresholds } from "@/lib/api";
import { Settings2, RotateCcw } from "lucide-react";

interface DoorThresholdConfigProps {
  doorId: string;
  initialConfig: {
    heldOpenThresholdMs: number | null;
    settlingTimeoutMs: number | null;
  };
  onSaved: () => void;
}

export function DoorThresholdConfig({
  doorId,
  initialConfig,
  onSaved,
}: DoorThresholdConfigProps) {
  const [heldOpenThresholdMs, setHeldOpenThresholdMs] = useState<number>(
    initialConfig.heldOpenThresholdMs ?? 30000,
  );
  const [settlingTimeoutMs, setSettlingTimeoutMs] = useState<number>(
    initialConfig.settlingTimeoutMs ?? 500,
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateDoorThresholds(doorId, {
        heldOpenThresholdMs,
        settlingTimeoutMs,
      });
      toast("Seuils mis à jour avec succès", "success");
      onSaved();
    } catch {
      toast("Échec de la mise à jour des seuils", "error");
    } finally {
      setSaving(false);
    }
  }, [doorId, heldOpenThresholdMs, settlingTimeoutMs, onSaved]);

  const handleReset = useCallback(async () => {
    setHeldOpenThresholdMs(30000);
    setSettlingTimeoutMs(500);
    setSaving(true);
    try {
      await updateDoorThresholds(doorId, {
        heldOpenThresholdMs: null as any,
        settlingTimeoutMs: null as any,
      });
      toast("Seuils réinitialisés aux valeurs par défaut", "success");
      onSaved();
    } catch {
      toast("Échec de la réinitialisation", "error");
    } finally {
      setSaving(false);
    }
  }, [doorId, onSaved]);

  if (loading) {
    return (
      <GlassCard className="p-4">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-10 w-24" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4" />
        Seuils de la porte
      </h3>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">
            Seuil porte ouverte (ms) — 100 à 30 000
            {initialConfig.heldOpenThresholdMs == null && (
              <span className="ml-2 text-xs text-amber-400">
                Valeur par défaut
              </span>
            )}
          </Label>
          <input
            type="range"
            min={100}
            max={30000}
            step={100}
            value={heldOpenThresholdMs}
            onChange={(e) => setHeldOpenThresholdMs(parseInt(e.target.value, 10))}
            className="w-full mt-1"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{heldOpenThresholdMs} ms ({(heldOpenThresholdMs / 1000).toFixed(1)}s)</span>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">
            Temporisation (ms) — 100 à 60 000
            {initialConfig.settlingTimeoutMs == null && (
              <span className="ml-2 text-xs text-amber-400">
                Valeur par défaut
              </span>
            )}
          </Label>
          <input
            type="number"
            min={100}
            max={60000}
            value={settlingTimeoutMs}
            onChange={(e) => setSettlingTimeoutMs(parseInt(e.target.value, 10) || 500)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
