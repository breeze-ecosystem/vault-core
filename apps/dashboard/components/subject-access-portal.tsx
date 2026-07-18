"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Trash2,
  Edit3,
  Shield,
  User,
  Calendar,
  Camera,
  FileText,
  Send,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  requestSubjectAccessOtp,
  verifySubjectAccessOtp,
  submitSubjectAccessRequest,
} from "@/lib/api";
import type { SubjectDataDto } from "@repo/shared";

type PortalStep = "email" | "verify" | "data" | "action";

export function SubjectAccessPortal() {
  const [step, setStep] = useState<PortalStep>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [subjectData, setSubjectData] = useState<SubjectDataDto | null>(null);
  const [actionType, setActionType] = useState<"rectify" | "delete" | null>(null);
  const [rectifyText, setRectifyText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP input refs for focus management
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleRequestOtp = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Veuillez saisir une adresse email valide");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await requestSubjectAccessOtp(email.trim());
      setStep("verify");
      toast.success("Code envoyé à " + email);
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(0, 1);
    setOtpCode(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join("");
    if (code.length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await verifySubjectAccessOtp(email.trim(), code);
      setSubjectData(data);
      setStep("data");
      toast.success("Identité vérifiée");
    } catch (err: any) {
      setError(err.message || "Code incorrect");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestSubjectAccessOtp(email.trim());
      toast.success("Nouveau code envoyé");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRectify = async () => {
    if (!rectifyText.trim()) {
      setError("Veuillez décrire les informations à rectifier");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await submitSubjectAccessRequest(
        email.trim(),
        "rectify",
        rectifyText.trim(),
      );
      setReferenceId(result.referenceId);
      setStep("action");
      toast.success("Demande de rectification envoyée");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDelete = async () => {
    if (deleteConfirm !== "SUPPRIMER") {
      setError('Tapez "SUPPRIMER" pour confirmer');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await submitSubjectAccessRequest(
        email.trim(),
        "delete",
      );
      setReferenceId(result.referenceId);
      setStep("action");
      toast.success("Demande de suppression envoyée");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("email");
    setEmail("");
    setOtpCode(["", "", "", "", "", ""]);
    setSubjectData(null);
    setActionType(null);
    setRectifyText("");
    setDeleteConfirm("");
    setReferenceId(null);
    setError(null);
  };

  return (
    <GlassCard className="mx-auto max-w-lg p-6">
      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {(["email", "verify", "data", "action"] as const).map((s, idx) => {
          const stepOrder = ["email", "verify", "data", "action"];
          const currentIdx = stepOrder.indexOf(step);
          const isComplete = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isComplete && "bg-success text-success-foreground",
                  isActive && "border-2 border-primary bg-primary/10 text-primary",
                  !isComplete && !isActive && "border border-border text-muted-foreground/50",
                )}
              >
                {isComplete ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 3 && (
                <div
                  className={cn(
                    "h-px w-8",
                    isComplete ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">
                Vérification d&apos;identité
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saisissez votre adresse email pour recevoir un code de
                vérification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portal-email">Adresse email</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="portal-email"
                    type="email"
                    placeholder="exemple@organisation.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Vérifier mon identité
                </>
              )}
            </Button>
          </motion.div>
        )}

        {step === "verify" && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Key className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">
                Consultation des données
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Un code à 6 chiffres a été envoyé à{" "}
                <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <Label>Code de vérification</Label>
              <div className="flex justify-center gap-2">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="h-12 w-10 rounded-md border border-input bg-background text-center text-lg font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification...
                </>
              ) : (
                "Vérifier le code"
              )}
            </Button>

            <div className="text-center">
              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="text-xs text-primary hover:underline"
              >
                Renvoyer le code
              </button>
            </div>
          </motion.div>
        )}

        {step === "data" && subjectData && (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-7 w-7 text-success" />
              </div>
              <h2 className="text-lg font-semibold">Données personnelles</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Voici les données associées à votre compte
              </p>
            </div>

            {/* User info cards */}
            <div className="grid grid-cols-2 gap-3">
              <GlassCard className="p-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Nom</span>
                </div>
                <p className="mt-1 text-sm font-medium">{subjectData.name}</p>
              </GlassCard>
              <GlassCard className="p-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Rôle</span>
                </div>
                <p className="mt-1 text-sm font-medium">{subjectData.role}</p>
              </GlassCard>
            </div>

            {/* Sites */}
            <GlassCard className="p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Sites
              </p>
              <div className="flex flex-wrap gap-2">
                {subjectData.sites.map((site, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {site}
                  </span>
                ))}
              </div>
            </GlassCard>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <GlassCard className="p-3 text-center">
                <Calendar className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Dernier accès
                </p>
                <p className="text-xs font-medium">
                  {new Date(subjectData.lastAccess).toLocaleDateString("fr-FR")}
                </p>
              </GlassCard>
              <GlassCard className="p-3 text-center">
                <Camera className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Alertes</p>
                <p className="text-lg font-semibold">
                  {subjectData.relatedAlerts}
                </p>
              </GlassCard>
              <GlassCard className="p-3 text-center">
                <User className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Visages</p>
                <p className="text-lg font-semibold">
                  {subjectData.relatedFaces}
                </p>
              </GlassCard>
            </div>

            {/* Data Items */}
            {subjectData.dataItems.length > 0 && (
              <GlassCard className="p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Éléments de données
                </p>
                <div className="space-y-2">
                  {subjectData.dataItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs">{item.description}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActionType("rectify");
                  setStep("action");
                }}
                className="w-full"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Signaler une erreur
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setActionType("delete");
                  setStep("action");
                }}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Demander la suppression
              </Button>
            </div>
          </motion.div>
        )}

        {step === "action" && (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {referenceId ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-7 w-7 text-success" />
                </div>
                <h2 className="text-lg font-semibold">Demande envoyée</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Votre demande a été enregistrée avec le numéro de référence :
                </p>
                <p className="mt-2 font-mono text-lg font-semibold text-primary">
                  {referenceId}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Un administrateur traitera votre demande dans les plus brefs
                  délais.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={resetFlow}
                >
                  Retour à l&apos;accueil
                </Button>
              </div>
            ) : actionType === "rectify" ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Edit3 className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    Signaler une erreur
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Décrivez les informations à corriger
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rectify-text">Description</Label>
                  <textarea
                    id="rectify-text"
                    rows={4}
                    placeholder="Décrivez les informations inexactes et les corrections à apporter..."
                    value={rectifyText}
                    onChange={(e) => setRectifyText(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("data")}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                  </Button>
                  <Button
                    onClick={handleSendRectify}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer la demande
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <Trash2 className="h-7 w-7 text-destructive" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    Demander la suppression
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cette action est irréversible. Tapez{" "}
                    <strong>SUPPRIMER</strong> pour confirmer.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirm">
                    Tapez SUPPRIMER pour confirmer
                  </Label>
                  <Input
                    id="delete-confirm"
                    placeholder="SUPPRIMER"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="text-center font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("data")}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRequestDelete}
                    disabled={loading || deleteConfirm !== "SUPPRIMER"}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Confirmer la suppression
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
