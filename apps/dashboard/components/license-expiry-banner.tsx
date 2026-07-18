"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, WifiOff, ShieldOff, Clock, X } from "lucide-react";
import { getLicenseStatus } from "@/lib/api";
import type { LicenseStatusDto } from "@repo/shared";

const DISMISS_KEY = "banner-dismissed-";

export function LicenseExpiryBanner() {
  const [status, setStatus] = useState<LicenseStatusDto | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getLicenseStatus();
      setStatus(data);
    } catch {
      // Silently fail — banner won't show
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!status || dismissed) return null;

  const dismissible =
    status.licenseState === "grace" ||
    (status.licenseState === "trial" && status.trialEndsAt);

  if (dismissible) {
    const dismissedKey = DISMISS_KEY + status.licenseState;
    const dismissedTime = localStorage.getItem(dismissedKey);
    if (dismissedTime && Date.now() - parseInt(dismissedTime) < 86400000) {
      return null;
    }
  }

  function handleDismiss() {
    if (dismissible && status) {
      localStorage.setItem(DISMISS_KEY + status.licenseState, String(Date.now()));
    }
    setDismissed(true);
  }

  const configs: Record<string, {
    bg: string;
    border: string;
    text: string;
    icon: typeof AlertTriangle;
    message: string;
    action: { label: string; href: string };
    persistent: boolean;
  }> = {
    grace: {
      bg: "bg-warning/10",
      border: "border-warning/20",
      text: "text-amber-400",
      icon: AlertTriangle,
      message: status.expiresAt
        ? `Votre licence expire dans ${Math.ceil((new Date(status.expiresAt).getTime() - Date.now()) / 86400000)} jours.`
        : "Votre licence expire bientôt.",
      action: { label: "Voir ma licence", href: "/parametres/licence" },
      persistent: false,
    },
    degraded: {
      bg: "bg-warning/15",
      border: "border-warning/30",
      text: "text-amber-400",
      icon: WifiOff,
      message: "Mode dégradé : connexion au serveur perdue. Certaines fonctions sont désactivées.",
      action: { label: "Voir ma licence", href: "/parametres/licence" },
      persistent: true,
    },
    expired: {
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      text: "text-red-400",
      icon: ShieldOff,
      message: "Votre licence a expiré. Le tableau de bord passe en lecture seule.",
      action: { label: "Réactiver", href: "/activate" },
      persistent: true,
    },
  };

  const trialEnding =
    status.licenseState === "trial" &&
    status.trialEndsAt &&
    Math.ceil((new Date(status.trialEndsAt).getTime() - Date.now()) / 86400000) <= 1;

  if (trialEnding) {
    return (
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-warning/20 bg-warning/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <Clock className="h-4 w-4" />
          <span>Votre essai gratuit expire demain.</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/parametres/licence"
            className="text-sm font-medium text-primary hover:underline"
          >
            Activer une licence
          </Link>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const config = configs[status.licenseState];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={`sticky top-0 z-40 flex items-center justify-between border-b ${config.border} ${config.bg} px-4 py-3`}
    >
      <div className={`flex items-center gap-2 text-sm ${config.text}`}>
        <Icon className="h-4 w-4" />
        <span>{config.message}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={config.action.href}
          className="text-sm font-medium text-primary hover:underline"
        >
          {config.action.label}
        </Link>
        {!config.persistent && (
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
