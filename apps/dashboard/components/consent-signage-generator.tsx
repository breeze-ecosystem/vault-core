"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Camera,
  Download,
  Loader2,
  FileText,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { itemVariants } from "@/components/page-transition";
import { toast } from "@/components/ui/toast";

interface CameraOption {
  id: string;
  name: string;
  siteName: string;
}

interface ConsentSignageGeneratorProps {
  cameras: CameraOption[];
  loading?: boolean;
}

export function ConsentSignageGenerator({
  cameras,
  loading = false,
}: ConsentSignageGeneratorProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId);

  const handleGenerate = async () => {
    if (!selectedCameraId) return;
    setGenerating(true);
    try {
      // Simulate PDF generation
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setGenerated(true);
      toast.success("Signalétique générée — Prête à imprimer");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Chargement des caméras...
            </p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  if (cameras.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="px-5 py-8 text-center">
          <Camera className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucune caméra trouvée
          </p>
          <p className="text-xs text-muted-foreground">
            Ajoutez des caméras pour générer la signalétique de consentement
          </p>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">
            Signalétique de consentement
          </h3>
        </div>

        <div className="space-y-4">
          {/* Camera selector */}
          <div className="space-y-2">
            <Label htmlFor="camera-select">Caméra</Label>
            <select
              id="camera-select"
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                setGenerated(false);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Sélectionnez une caméra</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.name} — {cam.siteName}
                </option>
              ))}
            </select>
          </div>

          {/* Selected camera info */}
          {selectedCamera && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{selectedCamera.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCamera.siteName}
                </p>
              </div>
            </div>
          )}

          {/* Generate button */}
          {selectedCameraId && !generated && (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Générer la signalétique
                </>
              )}
            </Button>
          )}

          {/* Success state */}
          {generated && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-success">
                    Signalétique prête
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCamera?.name} — {selectedCamera?.siteName}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  toast.success("Téléchargement de la signalétique");
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
