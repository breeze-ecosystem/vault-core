"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Share2,
  Link,
  Copy,
  Check,
  X,
  Trash2,
  Loader2,
  Clock,
  Camera as CameraIcon,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { ShareLink } from "@/lib/api";

interface ShareCamera {
  id: string;
  name: string;
}

interface StreamShareSheetProps {
  cameras: ShareCamera[];
  shares: ShareLink[];
  loading: boolean;
  onGenerate: (data: { cameraIds: string[]; durationMinutes: number }) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
}

const DURATION_OPTIONS = [
  { minutes: 60, label: "1 heure" },
  { minutes: 360, label: "6 heures" },
  { minutes: 1440, label: "24 heures" },
];

export function StreamShareSheet({
  cameras,
  shares,
  loading,
  onGenerate,
  onRevoke,
}: StreamShareSheetProps) {
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [duration, setDuration] = useState(360);
  const [customDuration, setCustomDuration] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const toggleCamera = (id: string) => {
    setSelectedCameras((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
    setGeneratedLink(null);
  };

  const handleGenerate = useCallback(async () => {
    if (selectedCameras.length === 0) return;
    setGenerating(true);
    try {
      const mins = duration === -1 ? parseInt(customDuration) || 60 : duration;
      await onGenerate({ cameraIds: selectedCameras, durationMinutes: mins });
      toast("Lien de partage généré", "success");
    } catch (err: any) {
      toast(err.message || "Erreur de génération", "error");
    } finally {
      setGenerating(false);
    }
  }, [selectedCameras, duration, customDuration, onGenerate]);

  const handleCopy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setGeneratedLink(link);
      toast("Lien copié !", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
      setGeneratedLink(link);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await onRevoke(id);
      toast("Partage révoqué", "success");
    } catch (err: any) {
      toast(err.message || "Erreur lors de la révocation", "error");
    } finally {
      setRevoking(null);
    }
  };

  const displayDuration = duration === -1
    ? `${customDuration || "..."} min`
    : DURATION_OPTIONS.find((d) => d.minutes === duration)?.label || "Personnalisé";

  return (
    <div className="space-y-6">
      {/* Generate share section */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Générer un lien de partage</h3>
        </div>

        {/* Camera selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm text-muted-foreground">
            Caméras à partager
          </label>
          {cameras.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune caméra disponible</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cameras.map((cam) => {
                const selected = selectedCameras.includes(cam.id);
                return (
                  <button
                    key={cam.id}
                    onClick={() => toggleCamera(cam.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent/50",
                    )}
                  >
                    <CameraIcon className="h-3.5 w-3.5" />
                    {cam.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Duration selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm text-muted-foreground">
            Durée d&apos;accès
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <Button
                key={opt.minutes}
                variant={duration === opt.minutes ? "default" : "outline"}
                size="sm"
                onClick={() => { setDuration(opt.minutes); setCustomDuration(""); }}
              >
                {opt.label}
              </Button>
            ))}
            <Button
              variant={duration === -1 ? "default" : "outline"}
              size="sm"
              onClick={() => setDuration(-1)}
            >
              Personnalisé
            </Button>
          </div>
          {duration === -1 && (
            <div className="mt-2">
              <input
                type="number"
                placeholder="Durée en minutes"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="w-40 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                min={1}
              />
            </div>
          )}
        </div>

        {/* Generate CTA */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={selectedCameras.length === 0 || generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Générer le lien
              </>
            )}
          </Button>

          {selectedCameras.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedCameras.length} caméra{selectedCameras.length > 1 ? "s" : ""} sélectionnée
              {selectedCameras.length > 1 ? "s" : ""} — {displayDuration}
            </p>
          )}
        </div>

        {/* Warning */}
        <p className="mt-3 text-xs text-muted-foreground">
          Le tiers pourra accéder au flux sans authentification pendant la durée définie.
        </p>
      </GlassCard>

      {/* Active shares section */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Partages actifs</h3>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : shares.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Share2 className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun partage actif</p>
            <p className="text-xs text-muted-foreground mt-1">
              Générez un lien pour partager l&apos;accès à vos caméras
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-start justify-between rounded-lg border border-border p-4"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                      {share.link}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(share.link)}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {share.cameras?.map((c) => c.name).join(", ") || "Toutes les caméras"}
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    Expire le {new Date(share.expiresAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      share.status === "active"
                        ? "success"
                        : share.status === "expired"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {share.status === "active"
                      ? "Actif"
                      : share.status === "expired"
                      ? "Expiré"
                      : "Révoqué"}
                  </Badge>
                  {share.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleRevoke(share.id)}
                      disabled={revoking === share.id}
                    >
                      {revoking === share.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
