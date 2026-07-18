"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Sparkles, ClipboardPasteIcon, Loader2, CheckCircle2 } from "lucide-react";
import { getLicenseStatus, activateLicense, startTrial } from "@/lib/api";

export default function ActivationPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [trialStarting, setTrialStarting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const status = await getLicenseStatus();
        if (status.licenseState === "active" || status.licenseState === "trial") {
          router.replace("/");
        }
      } catch {
        // No license — show wizard
      } finally {
        setChecking(false);
      }
    }
    check();
  }, [router]);

  async function handleActivate() {
    setError("");
    setActivating(true);
    try {
      await activateLicense(licenseKey);
      setSuccess(true);
      setTimeout(() => router.replace("/"), 1500);
    } catch (err: any) {
      setError(err.message || "Échec de l'activation. Veuillez réessayer ou contacter le support.");
    } finally {
      setActivating(false);
    }
  }

  async function handleTrial() {
    setError("");
    setTrialStarting(true);
    try {
      await startTrial();
      setSuccess(true);
      setTimeout(() => router.replace("/"), 1500);
    } catch (err: any) {
      setError(err.message || "Échec du démarrage de l'essai gratuit.");
    } finally {
      setTrialStarting(false);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setLicenseKey(text);
    } catch {
      // Fallback: user can manually paste
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Vérification de la licence...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-lg font-semibold text-white">Licence activée avec succès !</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(190,90%,50%,0.08),transparent_70%)]" />
      <div className="relative z-10 w-full max-w-[480px] rounded-2xl border border-border bg-card/80 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">
            Bienvenue sur OVERSIGHT AI
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Activez votre licence pour commencer à utiliser la plateforme de surveillance intelligente.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              showKeyInput
                ? "border-primary/30 bg-accent/5"
                : "border-border hover:border-primary/30 hover:bg-accent/5"
            }`}
          >
            <KeyRound className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-white">J&apos;ai une clé de licence</p>
              <p className="text-xs text-muted-foreground">
                Saisissez la clé que vous avez reçue par email
              </p>
            </div>
          </button>

          {showKeyInput && (
            <div className="space-y-3 pl-12">
              <div className="relative">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Collez votre clé de licence"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-white placeholder-muted-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  aria-label="Coller"
                >
                  <ClipboardPasteIcon className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleActivate}
                disabled={activating || !licenseKey}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {activating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Activer ma licence"
                )}
              </button>
            </div>
          )}

          <button
            onClick={handleTrial}
            disabled={trialStarting}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              !showKeyInput
                ? "border-border hover:border-primary/30 hover:bg-accent/5"
                : "border-border opacity-60"
            }`}
          >
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-white">Démarrer un essai gratuit de 7 jours</p>
              <p className="text-xs text-muted-foreground">
                Essayez toutes les fonctionnalités du pack VISION sans engagement
              </p>
            </div>
            {trialStarting && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; 2026 DigitSoft Africa
        </p>
      </div>
    </div>
  );
}
