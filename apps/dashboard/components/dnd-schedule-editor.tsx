"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Bell,
  BellOff,
  Save,
  Loader2,
  AlertTriangle,
  Moon,
} from "lucide-react";
import type { DndConfig, DndEntry } from "@/lib/api";

interface DNDScheduleEditorProps {
  config: DndConfig | null;
  loading: boolean;
  onSave: (data: Partial<DndConfig>) => Promise<void>;
}

const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export function DNDScheduleEditor({
  config,
  loading,
  onSave,
}: DNDScheduleEditorProps) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [sameForAll, setSameForAll] = useState(config?.sameForAllDays ?? true);
  const [criticalOverride, setCriticalOverride] = useState(config?.criticalOverride ?? true);
  const [schedule, setSchedule] = useState<DndEntry[]>(config?.schedule ?? [
    { dayOfWeek: 0, startTime: "22:00", endTime: "07:00" },
  ]);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <GlassCard className="p-6">
        <Skeleton className="mb-4 h-5 w-48" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-40 w-full" />
      </GlassCard>
    );
  }

  const getEntryForDay = (dayIndex: number): DndEntry | undefined => {
    if (sameForAll) {
      return schedule.find(() => true) || schedule[0];
    }
    return schedule.find((e) => e.dayOfWeek === dayIndex);
  };

  const updateTime = (dayIndex: number, field: "startTime" | "endTime", value: string) => {
    if (sameForAll) {
      setSchedule(schedule.map((e) => ({ ...e, [field]: value })));
    } else {
      const existing = schedule.findIndex((e) => e.dayOfWeek === dayIndex);
      if (existing >= 0) {
        const updated = [...schedule];
        updated[existing] = { ...updated[existing], [field]: value };
        setSchedule(updated);
      } else {
        setSchedule([
          ...schedule,
          { dayOfWeek: dayIndex, startTime: field === "startTime" ? value : "22:00", endTime: field === "endTime" ? value : "07:00" },
        ]);
      }
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (sameForAll) return;
    const existing = schedule.find((e) => e.dayOfWeek === dayIndex);
    if (existing) {
      setSchedule(schedule.filter((e) => e.dayOfWeek !== dayIndex));
    } else {
      setSchedule([
        ...schedule,
        { dayOfWeek: dayIndex, startTime: "22:00", endTime: "07:00" },
      ]);
    }
  };

  const isDayActive = (dayIndex: number): boolean => {
    if (sameForAll) return true;
    return schedule.some((e) => e.dayOfWeek === dayIndex);
  };

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        enabled,
        sameForAllDays: sameForAll,
        schedule,
        criticalOverride,
      });
      toast("Paramètres de notifications silencieuses enregistrés", "success");
    } catch (err: any) {
      toast(err.message || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        {/* Global toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {enabled ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="text-base font-semibold">
                Notifications silencieuses
              </h3>
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? "Les notifications sont filtrées selon le planning"
                  : "Toutes les notifications sont envoyées normalement"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              enabled ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                enabled && "translate-x-5",
              )}
            />
          </button>
        </div>

        {/* Status indicator */}
        {enabled && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            <BellOff className="h-4 w-4" />
            Mode silencieux actif
          </div>
        )}

        {/* Same for all days toggle */}
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm text-muted-foreground">
            Mêmes horaires pour tous les jours
          </label>
          <button
            onClick={() => setSameForAll(!sameForAll)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              sameForAll ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                sameForAll && "translate-x-5",
              )}
            />
          </button>
        </div>

        {/* Schedule matrix */}
        <div className="space-y-2">
          {DAYS.map((day, index) => {
            const active = isDayActive(index);
            const entry = getEntryForDay(index);
            return (
              <div
                key={day}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  active ? "border-border" : "border-dashed border-muted opacity-50",
                )}
              >
                {!sameForAll && (
                  <button
                    onClick={() => toggleDay(index)}
                    className={cn(
                      "h-4 w-4 rounded border transition-colors",
                      active ? "border-primary bg-primary" : "border-muted-foreground",
                    )}
                  >
                    {active && (
                      <span className="flex h-full items-center justify-center text-[10px] text-white">✓</span>
                    )}
                  </button>
                )}
                <span className={cn(
                  "w-24 text-sm font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}>
                  {day}
                </span>
                {active ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={entry?.startTime ?? "22:00"}
                      onChange={(e) => updateTime(index, "startTime", e.target.value)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">→</span>
                    <input
                      type="time"
                      value={entry?.endTime ?? "07:00"}
                      onChange={(e) => updateTime(index, "endTime", e.target.value)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Inactif</span>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Critical override */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="text-base font-semibold">Alertes critiques</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Les alertes critiques (intrusion, feu) passent toujours, même en mode silencieux.
            </p>
          </div>
          <button
            onClick={() => setCriticalOverride(!criticalOverride)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              criticalOverride ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                criticalOverride && "translate-x-5",
              )}
            />
          </button>
        </div>
      </GlassCard>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde en cours...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
