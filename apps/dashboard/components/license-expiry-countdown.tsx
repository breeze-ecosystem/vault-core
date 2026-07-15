"use client";

import { cn } from "@/lib/utils";

type LicenseState = 'trial' | 'active' | 'grace' | 'expired' | 'no_license';

interface LicenseExpiryCountdownProps {
  expiresAt?: string;
  graceEndsAt?: string;
  state: LicenseState;
}

function daysRemaining(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LicenseExpiryCountdown({ expiresAt, graceEndsAt, state }: LicenseExpiryCountdownProps) {
  if (state === "no_license" || !expiresAt) {
    return null;
  }

  if (state === "expired") {
    return (
      <p className="text-xs text-destructive">
        Expirée le {formatDate(expiresAt)}
      </p>
    );
  }

  if (state === "grace") {
    const days = graceEndsAt ? daysRemaining(graceEndsAt) : 0;
    return (
      <p className={cn("text-xs text-warning", "animate-pulse")}>
        Période de grâce — plus que {days} jour{days !== 1 ? "s" : ""}
      </p>
    );
  }

  if (state === "trial") {
    const days = daysRemaining(expiresAt);
    return (
      <p className="text-xs text-warning">
        Essai — {days} jour{days !== 1 ? "s" : ""} restant{days !== 1 ? "s" : ""}
      </p>
    );
  }

  // active state
  const days = daysRemaining(expiresAt);
  if (days < 1) {
    return (
      <p className="text-xs text-destructive">
        Expire aujourd'hui
      </p>
    );
  }

  if (days < 7) {
    return (
      <p className="text-xs text-warning">
        Expire dans {days} jour{days !== 1 ? "s" : ""}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Expire dans {days} jours
    </p>
  );
}
