"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Building2,
  FileText,
  Camera,
  Shield,
  Users,
  Download,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ─── Types ───

interface WizardStep {
  id: number;
  key: string;
  label: string;
  optional?: boolean;
}

interface WizardData {
  clientInfo: {
    organization: string;
    address: string;
    siret: string;
    representative: string;
  };
  processingTypes: string[];
  consentSignage: boolean;
  pseudonymization: boolean;
  portalConfig: {
    verificationMethod: "email" | "sms" | "both";
    otpExpiryMinutes: number;
  };
}

const STORAGE_KEY = "hapdp-wizard-state";

const STEPS: WizardStep[] = [
  { id: 1, key: "client-info", label: "Informations client" },
  { id: 2, key: "processing-types", label: "Traitements déclarés" },
  { id: 3, key: "consent-signage", label: "Signalétique consentement", optional: true },
  { id: 4, key: "pseudonymization", label: "Pseudonymisation" },
  { id: 5, key: "portal-config", label: "Portail accès sujet" },
  { id: 6, key: "review", label: "Récapitulatif + Export" },
];

const PROCESSING_TYPES = [
  { id: "video-surveillance", label: "Vidéo surveillance temps réel" },
  { id: "access-control", label: "Contrôle d'accès biométrique" },
  { id: "anpr", label: "Reconnaissance automatique de plaques" },
  { id: "face-recognition", label: "Reconnaissance faciale" },
  { id: "visitor-management", label: "Gestion des visiteurs" },
  { id: "hr-attendance", label: "Pointage et gestion des horaires" },
  { id: "incident-recording", label: "Enregistrement des incidents" },
  { id: "analytics", label: "Analyse comportementale" },
];

interface HapdpWizardProps {
  onComplete: () => void;
  onClose: () => void;
}

// ─── Initial Data ───

const DEFAULT_DATA: WizardData = {
  clientInfo: {
    organization: "",
    address: "",
    siret: "",
    representative: "",
  },
  processingTypes: [],
  consentSignage: false,
  pseudonymization: false,
  portalConfig: {
    verificationMethod: "email",
    otpExpiryMinutes: 10,
  },
};

function loadSavedData(): WizardData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_DATA, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_DATA;
}

function saveData(data: WizardData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ─── Step 1: Client Info ───

function ClientInfoStep({
  data,
  onChange,
}: {
  data: WizardData["clientInfo"];
  onChange: (d: WizardData["clientInfo"]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organisation</Label>
        <Input
          id="org-name"
          placeholder="Nom de l'organisation"
          value={data.organization}
          onChange={(e) => onChange({ ...data, organization: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-address">Adresse</Label>
        <Input
          id="org-address"
          placeholder="Adresse complète"
          value={data.address}
          onChange={(e) => onChange({ ...data, address: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="org-siret">Numéro SIRET</Label>
          <Input
            id="org-siret"
            placeholder="14 chiffres"
            value={data.siret}
            onChange={(e) => onChange({ ...data, siret: e.target.value })}
            maxLength={14}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-rep">Représentant légal</Label>
          <Input
            id="org-rep"
            placeholder="Nom du représentant"
            value={data.representative}
            onChange={(e) => onChange({ ...data, representative: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Processing Types ───

function ProcessingTypesStep({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Sélectionnez les types de traitements de données effectués par votre
        organisation.
      </p>
      <div className="space-y-2">
        {PROCESSING_TYPES.map((pt) => (
          <label
            key={pt.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30",
              selected.includes(pt.id) && "border-primary/50 bg-primary/5",
            )}
          >
            <input
              type="checkbox"
              checked={selected.includes(pt.id)}
              onChange={() => toggle(pt.id)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">{pt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Pseudonymization ───

function PseudonymizationStep({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">
            Pseudonymisation des données sensibles
          </p>
          <p className="text-xs text-muted-foreground">
            Masque automatiquement les visages, plaques et identifiants dans les
            captures et enregistrements.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onChange} />
      </div>

      {enabled && (
        <GlassCard variant="accent" className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Aperçu de la pseudonymisation</p>
              <div className="mt-3 flex items-center gap-4 rounded-lg bg-muted/50 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-16 rounded bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground">→</span>
                    <div className="h-3 w-16 rounded bg-primary/30" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Les visages détectés seront floutés automatiquement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ─── Step 5: Portal Config ───

function PortalConfigStep({
  config,
  onChange,
}: {
  config: WizardData["portalConfig"];
  onChange: (c: WizardData["portalConfig"]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configurez les paramètres du portail d&apos;accès aux données
        personnelles.
      </p>

      <div className="space-y-2">
        <Label>Méthode de vérification</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["email", "sms", "both"] as const).map((method) => (
            <button
              key={method}
              onClick={() => onChange({ ...config, verificationMethod: method })}
              className={cn(
                "rounded-lg border border-border p-3 text-left transition-colors",
                config.verificationMethod === method
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/30",
              )}
            >
              <span className="text-sm font-medium">
                {method === "email"
                  ? "Email"
                  : method === "sms"
                    ? "SMS"
                    : "Email + SMS"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp-expiry">Expiration du code OTP (minutes)</Label>
        <Input
          id="otp-expiry"
          type="number"
          min={1}
          max={60}
          value={config.otpExpiryMinutes}
          onChange={(e) =>
            onChange({
              ...config,
              otpExpiryMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 10)),
            })
          }
        />
      </div>
    </div>
  );
}

// ─── Step 6: Review and Export ───

function ReviewStep({
  data,
  onGenerate,
  generating,
}: {
  data: WizardData;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3">
        <Check className="h-5 w-5 text-success" />
        <p className="text-sm font-medium text-success">
          Toutes les informations sont complètes
        </p>
      </div>

      <div className="space-y-3">
        <GlassCard className="p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Informations client
          </h4>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Organisation :</span>{" "}
              {data.clientInfo.organization || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">SIRET :</span>{" "}
              {data.clientInfo.siret || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Représentant :</span>{" "}
              {data.clientInfo.representative || "—"}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Traitements déclarés
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.processingTypes.length > 0
              ? data.processingTypes.map((id) => {
                  const pt = PROCESSING_TYPES.find((p) => p.id === id);
                  return (
                    <span
                      key={id}
                      className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {pt?.label || id}
                    </span>
                  );
                })
              : <span className="text-sm text-muted-foreground">Aucun</span>}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuration
          </h4>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Signalétique consentement :</span>{" "}
              {data.consentSignage ? "Oui" : "Non (optionnel)"}
            </p>
            <p>
              <span className="text-muted-foreground">Pseudonymisation :</span>{" "}
              {data.pseudonymization ? "Activée" : "Désactivée"}
            </p>
            <p>
              <span className="text-muted-foreground">Vérification portail :</span>{" "}
              {data.portalConfig.verificationMethod === "email"
                ? "Email"
                : data.portalConfig.verificationMethod === "sms"
                  ? "SMS"
                  : "Email + SMS"}
            </p>
          </div>
        </GlassCard>
      </div>

      <Button
        onClick={onGenerate}
        disabled={generating}
        className="w-full"
        size="lg"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Tout est conforme — Générer la déclaration
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Main Wizard Component ───

export function HapdpWizard({ onComplete, onClose }: HapdpWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    const saved = loadSavedData();
    setWizardData(saved);
    setLoaded(true);
  }, []);

  // Auto-save after each step
  useEffect(() => {
    if (loaded) {
      saveData(wizardData);
    }
  }, [wizardData, loaded]);

  const updateData = useCallback(
    (updater: (prev: WizardData) => WizardData) => {
      setWizardData((prev) => {
        const next = updater(prev);
        return next;
      });
    },
    [],
  );

  const validateStep = (step: number): boolean => {
    const errors: Record<number, string> = {};

    switch (step) {
      case 0: // Client info
        if (!wizardData.clientInfo.organization.trim()) {
          errors[step] = "Le nom de l'organisation est requis";
        }
        break;
      case 1: // Processing types
        if (wizardData.processingTypes.length === 0) {
          errors[step] = "Sélectionnez au moins un type de traitement";
        }
        break;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Simulate PDF generation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Déclaration HAPDP générée — Téléchargement en cours");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  if (!loaded) {
    return (
      <GlassCard className="flex items-center justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </GlassCard>
    );
  }

  const step = STEPS[currentStep]!
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const stepError = stepErrors[currentStep];

  return (
    <div className="flex gap-6">
      {/* Sidebar Step Indicators */}
      <div className="hidden w-56 shrink-0 sm:block">
        <nav className="space-y-1">
          {STEPS.map((s, idx) => {
            const isActive = idx === currentStep;
            const isComplete = idx < currentStep;
            const hasError = !!stepErrors[idx];

            return (
              <button
                key={s.id}
                onClick={() => {
                  if (isComplete) setCurrentStep(idx);
                }}
                disabled={!isComplete && !isActive}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  isActive && "bg-primary/10 text-primary",
                  isComplete &&
                    "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  !isComplete &&
                    !isActive &&
                    "cursor-default text-muted-foreground/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isActive &&
                      "border-2 border-primary bg-primary/10 text-primary shadow-[0_0_8px_hsl(var(--shadcn-primary)/0.3)]",
                    isComplete && "bg-success text-success-foreground",
                    hasError && "border-2 border-destructive text-destructive",
                    !isComplete &&
                      !isActive &&
                      "border border-border text-muted-foreground/50",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : hasError ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    s.id
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-xs font-medium",
                      isActive && "text-primary",
                    )}
                  >
                    {s.label}
                  </p>
                  {s.optional && (
                    <p className="text-[10px] text-muted-foreground">
                      Optionnel
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">{step.label}</h2>
                {step.optional && (
                  <p className="text-xs text-muted-foreground">
                    Cette étape est optionnelle
                  </p>
                )}
              </div>

              {stepError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {stepError}
                </div>
              )}

              {currentStep === 0 && (
                <ClientInfoStep
                  data={wizardData.clientInfo}
                  onChange={(d) => updateData((prev) => ({ ...prev, clientInfo: d }))}
                />
              )}
              {currentStep === 1 && (
                <ProcessingTypesStep
                  selected={wizardData.processingTypes}
                  onChange={(ids) => updateData((prev) => ({ ...prev, processingTypes: ids }))}
                />
              )}
              {currentStep === 2 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Camera className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="mb-1 text-sm font-medium">
                    Signalétique de consentement
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Configurez les caméras et générez la signalétique
                    d&apos;affichage obligatoire.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateData((prev) => ({
                        ...prev,
                        consentSignage: !prev.consentSignage,
                      }))
                    }
                    className={cn(
                      wizardData.consentSignage &&
                        "border-success text-success",
                    )}
                  >
                    {wizardData.consentSignage
                      ? "Signalétique configurée ✓"
                      : "Configurer la signalétique"}
                  </Button>
                </div>
              )}
              {currentStep === 3 && (
                <PseudonymizationStep
                  enabled={wizardData.pseudonymization}
                  onChange={(v) =>
                    updateData((prev) => ({ ...prev, pseudonymization: v }))
                  }
                />
              )}
              {currentStep === 4 && (
                <PortalConfigStep
                  config={wizardData.portalConfig}
                  onChange={(c) =>
                    updateData((prev) => ({ ...prev, portalConfig: c }))
                  }
                />
              )}
              {currentStep === 5 && (
                <ReviewStep
                  data={wizardData}
                  onGenerate={handleGenerate}
                  generating={generating}
                />
              )}
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={isFirst ? onClose : handlePrev}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {isFirst ? "Fermer" : "Précédent"}
          </Button>

          {!isLast && (
            <Button onClick={handleNext}>
              Suivant
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
