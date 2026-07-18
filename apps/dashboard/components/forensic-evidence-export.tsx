"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileArchive,
  Video,
  FileText,
  Download,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Award,
} from "lucide-react";
import { certifyEvidence, downloadEvidence } from "@/lib/api";

type ExportFormat = "zip" | "clip";
type ExportStep = "format" | "metadata" | "certifying" | "complete" | "error";

interface ForensicEvidenceExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  eventType?: string;
  onComplete?: (evidenceId: string) => void;
}

export function ForensicEvidenceExport({
  open,
  onOpenChange,
  eventId,
  eventType,
  onComplete,
}: ForensicEvidenceExportProps) {
  const [step, setStep] = useState<ExportStep>("format");
  const [format, setFormat] = useState<ExportFormat>("zip");
  const [notes, setNotes] = useState("");
  const [caseRef, setCaseRef] = useState("");
  const [progress, setProgress] = useState(0);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = useCallback(() => {
    setStep("format");
    setFormat("zip");
    setNotes("");
    setCaseRef("");
    setProgress(0);
    setEvidenceId(null);
    setErrorMsg("");
  }, []);

  const handleStartCertification = async () => {
    if (!eventId) {
      toast("Aucun événement sélectionné", "error");
      return;
    }

    setStep("certifying");
    setProgress(0);

    // Simulate progress steps while BullMQ processes
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 800);

    try {
      const result = await certifyEvidence(eventId, format);

      // Progress to 100% on success
      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setEvidenceId(result.jobId);
        setStep("complete");
        if (onComplete) onComplete(result.jobId);
        toast("Certification judiciaire terminée", "success");
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setErrorMsg(err.message || "Échec de la certification");
      setStep("error");
      toast(err.message || "Échec de la certification", "error");
    }
  };

  const handleDownload = async () => {
    if (!evidenceId) return;
    try {
      const blob = await downloadEvidence(evidenceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `preuve-judiciaire-${evidenceId.substring(0, 8)}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast("Téléchargement démarré", "success");
    } catch (err: any) {
      toast(err.message || "Échec du téléchargement", "error");
    }
  };

  const handleRetry = () => {
    setStep("format");
    setProgress(0);
    setErrorMsg("");
  };

  // Empty state — no event selected
  if (open && !eventId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export de preuve judiciaire</DialogTitle>
            <DialogDescription>
              Certifiez une preuve avec horodatage TSA pour valeur légale.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">Aucun événement sélectionné</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sélectionnez un événement dans la chronologie pour exporter une preuve.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Export de preuve judiciaire
          </DialogTitle>
          <DialogDescription>
            Certifiez cet événement avec horodatage TSA pour valeur légale.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Format selection */}
          {step === "format" && (
            <motion.div
              key="format"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm font-medium">Format d&apos;export</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat("zip")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:bg-accent/50",
                    format === "zip"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card/50",
                  )}
                >
                  <FileArchive
                    className={cn(
                      "h-8 w-8",
                      format === "zip" ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      format === "zip" ? "text-primary" : "text-foreground",
                    )}
                  >
                    ZIP
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Archive complète avec métadonnées et certificat TSA
                  </span>
                </button>
                <button
                  onClick={() => setFormat("clip")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:bg-accent/50",
                    format === "clip"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card/50",
                  )}
                >
                  <Video
                    className={cn(
                      "h-8 w-8",
                      format === "clip" ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      format === "clip" ? "text-primary" : "text-foreground",
                    )}
                  >
                    Clip vidéo
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Extrait vidéo horodaté avec certificat d&apos;intégrité
                  </span>
                </button>
              </div>

              <Button
                className="w-full"
                onClick={() => setStep("metadata")}
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Metadata */}
          {step === "metadata" && (
            <motion.div
              key="metadata"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="caseRef">Référence d&apos;affaire</Label>
                <Input
                  id="caseRef"
                  placeholder="Ex: Dossier 2024-1234"
                  value={caseRef}
                  onChange={(e) => setCaseRef(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Input
                  id="notes"
                  placeholder="Observations complémentaires..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("format")}
                >
                  Retour
                </Button>
                <Button className="flex-1" onClick={handleStartCertification}>
                  Exporter comme preuve judiciaire
                  <Shield className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Certifying */}
          {step === "certifying" && (
            <motion.div
              key="certifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 py-4"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Award className="h-12 w-12 text-primary" />
                </motion.div>
                <div>
                  <p className="text-base font-semibold">
                    Certification en cours...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Horodatage TSA et calcul d&apos;empreinte SHA-256
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={Math.round(progress)} />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {progress < 30
                  ? "Préparation des fichiers..."
                  : progress < 60
                    ? "Calcul de l'empreinte numérique..."
                    : "Signature et scellement du certificat..."}
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 py-4"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div>
                  <p className="text-base font-semibold">
                    Preuve certifiée avec succès
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Certificat TSA inclus avec empreinte SHA-256
                  </p>
                </div>
              </div>

              <GlassCard className="bg-success/5 border-success/20 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-success shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium text-foreground">
                        Certificat TSA :
                      </span>{" "}
                      Inclus dans l&apos;archive
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Empreinte :
                      </span>{" "}
                      SHA-256 vérifiable
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Statut légal :
                      </span>{" "}
                      Preuve valide selon le RGPD Art. 5.2
                    </p>
                  </div>
                </div>
              </GlassCard>

              <Button className="w-full" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger la preuve certifiée
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
              >
                Fermer
              </Button>
            </motion.div>
          )}

          {/* Error state */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 py-4"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <p className="text-base font-semibold">
                    Échec de la certification
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {errorMsg || "Une erreur est survenue lors de la certification."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Fermer
                </Button>
                <Button className="flex-1" onClick={handleRetry}>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Réessayer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
