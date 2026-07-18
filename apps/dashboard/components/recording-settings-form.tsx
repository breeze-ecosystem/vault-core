"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  HardDrive,
  Video,
  Folder,
  AlertTriangle,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { RecordingConfig } from "@/lib/api";

interface RecordingSettingsFormProps {
  config: RecordingConfig | null;
  loading: boolean;
  onSave: (data: Partial<RecordingConfig>) => Promise<void>;
}

const RETENTION_OPTIONS = [
  { days: 7, label: "7 jours", desc: "Rotation rapide, idéal pour petits disques" },
  { days: 15, label: "15 jours", desc: "Équilibre stockage/sécurité" },
  { days: 30, label: "30 jours", desc: "Maximum de sécurité" },
];

export function RecordingSettingsForm({
  config,
  loading,
  onSave,
}: RecordingSettingsFormProps) {
  const [retentionDays, setRetentionDays] = useState(config?.retentionDays ?? 15);
  const [codec, setCodec] = useState<"H264" | "H265">(config?.codec ?? "H264");
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <GlassCard key={i} className="p-6">
            <Skeleton className="mb-4 h-5 w-48" />
            <Skeleton className="h-10 w-full" />
          </GlassCard>
        ))}
      </div>
    );
  }

  if (!config) {
    return (
      <GlassCard className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Impossible de charger la configuration</p>
      </GlassCard>
    );
  }

  const storagePercent = Math.round((config.storageUsedGb / config.storageTotalGb) * 100);
  const estimatedSpace =
    retentionDays === 7
      ? Math.round(config.storageUsedGb * 0.3)
      : retentionDays === 30
      ? Math.round(config.storageUsedGb * 1.5)
      : config.storageUsedGb;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ retentionDays, codec });
      toast("Paramètres enregistrés", "success");
    } catch (err: any) {
      toast(err.message || "Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Section 1 — Rétention */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Rétention des enregistrements</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {RETENTION_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRetentionDays(opt.days)}
              className={cn(
                "rounded-lg border p-4 text-left transition-all hover:bg-accent/50",
                retentionDays === opt.days
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card/50",
              )}
            >
              <span className={cn(
                "text-lg font-bold",
                retentionDays === opt.days ? "text-primary" : "text-foreground",
              )}>
                {opt.label}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Espace estimé: ~{estimatedSpace} Go
              </p>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              Stockage utilisé: {config.storageUsedGb} Go / {config.storageTotalGb} Go ({storagePercent}%)
            </span>
          </div>
          <Progress value={storagePercent} className={cn(
            "h-2",
            storagePercent > 95 && "[&>div]:bg-destructive",
            storagePercent > 80 && storagePercent <= 95 && "[&>div]:bg-warning",
          )} />
          {storagePercent > 95 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Espace disque critique. Les enregistrements les plus anciens seront supprimés.
            </p>
          )}
          {storagePercent > 80 && storagePercent <= 95 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              Espace disque faible ({config.storageUsedGb}/{config.storageTotalGb} Go). Libérez de l&apos;espace ou augmentez la capacité.
            </p>
          )}
        </div>
      </GlassCard>

      {/* Section 2 — Compression */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Compression vidéo</h3>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCodec("H264")}
            className={cn(
              "flex-1 rounded-lg border p-4 text-left transition-all hover:bg-accent/50",
              codec === "H264"
                ? "border-primary bg-primary/10"
                : "border-border bg-card/50",
            )}
          >
            <span className={cn(
              "text-sm font-semibold",
              codec === "H264" ? "text-primary" : "text-foreground",
            )}>
              H.264 (Standard)
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              Compatibilité maximale, consommation CPU réduite
            </p>
          </button>
          <button
            onClick={() => setCodec("H265")}
            className={cn(
              "flex-1 rounded-lg border p-4 text-left transition-all hover:bg-accent/50",
              codec === "H265"
                ? "border-primary bg-primary/10"
                : "border-border bg-card/50",
            )}
          >
            <span className={cn(
              "text-sm font-semibold",
              codec === "H265" ? "text-primary" : "text-foreground",
            )}>
              H.265/HEVC (Économique)
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              H.265 économise jusqu&apos;à 50% d&apos;espace disque
            </p>
          </button>
        </div>

        {codec === "H265" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Économie estimée: ~{Math.round(config.storageUsedGb * 0.4)} Go / mois
          </p>
        )}
      </GlassCard>

      {/* Section 3 — Emplacement */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Emplacement de stockage</h3>
        </div>

        <div className="rounded-lg border border-input bg-muted/30 px-4 py-3 font-mono text-sm">
          {config.storagePath}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          La gestion avancée du stockage est disponible avec le pack BASTION
        </p>
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
