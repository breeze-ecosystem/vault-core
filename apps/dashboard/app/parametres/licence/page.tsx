"use client";

import { useState, useEffect } from "react";
import { getLicenseStatus, getLicenseUsage, activateLicense } from "@/lib/api";
import { Loader2, KeyRound, ShieldAlert } from "lucide-react";
import type { LicenseStatusDto } from "@repo/shared";

interface UsageInfo {
  cameras: { current: number; max: number | null };
  doors: { current: number; max: number | null };
}

export default function LicenseSettingsPage() {
  const [status, setStatus] = useState<LicenseStatusDto | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statusData, usageData] = await Promise.all([
          getLicenseStatus(),
          getLicenseUsage().catch(() => null),
        ]);
        setStatus(statusData);
        setUsage(usageData);
      } catch {
        setError("Erreur de chargement des informations de licence");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getBadgeVariant(state: string) {
    switch (state) {
      case "active": return "bg-green-500/20 text-green-400";
      case "trial": return "bg-blue-500/20 text-blue-400";
      case "grace": return "bg-amber-500/20 text-amber-400";
      case "degraded": return "bg-amber-500/20 text-amber-400";
      case "expired": return "bg-red-500/20 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  }

  function getStateLabel(state: string) {
    const labels: Record<string, string> = {
      active: "Active",
      trial: "Essai",
      grace: "Expire bientôt",
      degraded: "Mode dégradé",
      expired: "Expirée",
      no_license: "Non activée",
    };
    return labels[state] || state;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Licence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre licence et vos limites d&apos;utilisation
        </p>
      </div>

      {status?.licenseState === "no_license" ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-12 text-center">
          <KeyRound className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium text-white">Aucune licence active</h3>
          <p className="text-sm text-muted-foreground">
            Activez votre licence ou démarrez un essai gratuit de 7 jours.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Statut de la licence</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getBadgeVariant(status?.licenseState || "")}`}>
                {getStateLabel(status?.licenseState || "")}
              </span>
            </div>
            {status?.pack && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Pack {status.pack}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Période de validité</p>
              {status?.expiresAt ? (
                <p className="mt-2 text-sm text-white">
                  {new Date(status.expiresAt).toLocaleDateString("fr-FR")}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">État</p>
              <p className="mt-2 text-sm text-white">
                {getStateLabel(status?.licenseState || "")}
                {status?.trialEndsAt && (
                  <span className="ml-2 text-xs text-amber-400">
                    J-{Math.ceil((new Date(status.trialEndsAt).getTime() - Date.now()) / 86400000)} restants
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-semibold text-white">Limites d&apos;utilisation</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-white">Caméras</span>
                  <span className="text-muted-foreground">
                    {usage?.cameras.current ?? "?"} / {usage?.cameras.max ?? "∞"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{
                      width: usage?.cameras.max
                        ? `${Math.min(100, ((usage.cameras.current / usage.cameras.max) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
              {usage?.doors.max != null && (
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-white">Portes</span>
                    <span className="text-muted-foreground">
                      {usage.doors.current} / {usage.doors.max}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (usage.doors.current / usage.doors.max) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
