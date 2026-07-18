"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Shield,
  ShieldOff,
  Wifi,
  Plus,
  Trash2,
  Timer,
  Clock,
  Save,
  Loader2,
  AlertTriangle,
  Smartphone,
} from "lucide-react";
import type { GeofencingStatus, GeofencingConfig } from "@/lib/api";

interface GeofencingSettingsProps {
  status: GeofencingStatus | null;
  config: GeofencingConfig | null;
  loading: boolean;
  onSaveConfig: (data: Partial<GeofencingConfig>) => Promise<void>;
  onForceArm: () => Promise<void>;
  onForceDisarm: () => Promise<void>;
}

export function GeofencingSettings({
  status,
  config,
  loading,
  onSaveConfig,
  onForceArm,
  onForceDisarm,
}: GeofencingSettingsProps) {
  const [armDelay, setArmDelay] = useState(config?.armDelayMinutes ?? 10);
  const [timeout, setTimeout_] = useState(config?.timeoutMinutes ?? 15);
  const [reinforced, setReinforced] = useState(config?.reinforcedSensitivity ?? true);
  const [newSsid, setNewSsid] = useState("");
  const [ssids, setSsids] = useState<string[]>(config?.trustedSsids ?? []);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i} className="p-6">
            <Skeleton className="mb-4 h-5 w-48" />
            <Skeleton className="h-10 w-full" />
          </GlassCard>
        ))}
      </div>
    );
  }

  function addSsid() {
    const trimmed = newSsid.trim();
    if (!trimmed) return;
    if (ssids.includes(trimmed)) return;
    setSsids([...ssids, trimmed]);
    setNewSsid("");
  }

  function removeSsid(ssid: string) {
    setSsids(ssids.filter((s) => s !== ssid));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveConfig({
        trustedSsids: ssids,
        armDelayMinutes: armDelay,
        timeoutMinutes: timeout,
        reinforcedSensitivity: reinforced,
      });
      toast("Paramètres d'absence enregistrés", "success");
    } catch (err: any) {
      toast(err.message || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  const isArmed = status?.armed ?? false;

  return (
    <div className="space-y-6">
      {/* Section 1 — État actuel */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {isArmed ? (
            <Shield className="h-5 w-5 text-green-400" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          )}
          <h3 className="text-base font-semibold">État actuel</h3>
        </div>

        <div className={cn(
          "flex items-center gap-3 rounded-lg border p-4 text-lg font-bold",
          isArmed
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-muted bg-muted/30 text-muted-foreground",
        )}>
          {isArmed ? (
            <Shield className="h-6 w-6" />
          ) : (
            <ShieldOff className="h-6 w-6" />
          )}
          {isArmed ? "Armé" : "Désarmé"}
          {status?.manualOverride && (
            <Badge variant="warning">Forcé</Badge>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Smartphone className="h-4 w-4" />
            {status?.connectedPhones ?? 0} téléphone(s) connecté(s)
          </div>
          {status?.lastChangeAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Dernier changement: {new Date(status.lastChangeAt).toLocaleString("fr-FR")}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Section 2 — Réseaux WiFi */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Réseaux WiFi de confiance</h3>
        </div>

        {ssids.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-3">
            Aucun réseau WiFi configuré. Ajoutez des réseaux depuis l&apos;application mobile.
          </p>
        ) : (
          <div className="mb-3 space-y-2">
            {ssids.map((ssid) => (
              <div
                key={ssid}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" />
                  <span className="text-sm">{ssid}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeSsid(ssid)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newSsid}
            onChange={(e) => setNewSsid(e.target.value)}
            placeholder="Nom du réseau WiFi (SSID)"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addSsid()}
          />
          <Button variant="outline" size="sm" onClick={addSsid} disabled={!newSsid.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </GlassCard>

      {/* Section 3 — Paramètres */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Paramètres</h3>
        </div>

        <div className="space-y-5">
          {/* Arm delay slider */}
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">
              Délai d&apos;armement: {armDelay} min
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={armDelay}
              onChange={(e) => setArmDelay(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min</span>
              <span>30 min</span>
            </div>
          </div>

          {/* Timeout slider */}
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">
              Timeout absence: {timeout} min
            </label>
            <input
              type="range"
              min={5}
              max={30}
              value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 min</span>
              <span>30 min</span>
            </div>
          </div>

          {/* Reinforced sensitivity */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-muted-foreground">
                Sensibilité renforcée en mode absence
              </label>
              <p className="text-xs text-muted-foreground/60">
                Détection plus sensible lorsque le mode absence est actif
              </p>
            </div>
            <button
              onClick={() => setReinforced(!reinforced)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                reinforced ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  reinforced && "translate-x-5",
                )}
              />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Section 4 — Programmation et actions */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Actions manuelles</h3>
        </div>

        <div className="flex gap-3">
          <Button
            variant={isArmed ? "outline" : "default"}
            onClick={onForceArm}
            disabled={isArmed}
          >
            <Shield className="mr-2 h-4 w-4" />
            Forcer l&apos;armement
          </Button>
          <Button
            variant={isArmed ? "destructive" : "outline"}
            onClick={onForceDisarm}
            disabled={!isArmed}
          >
            <ShieldOff className="mr-2 h-4 w-4" />
            Forcer le désarmement
          </Button>
        </div>

        {status?.manualOverride && (
          <p className="mt-2 text-xs text-muted-foreground">
            Mode manuel actif — la géolocalisation automatique est suspendue
          </p>
        )}
      </GlassCard>

      {/* Save button */}
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
