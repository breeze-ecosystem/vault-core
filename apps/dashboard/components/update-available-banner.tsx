"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUpCircle, X } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UpdateInfo {
  latestVersion: string;
  changelogUrl: string;
  releaseDate: string;
  isCritical: boolean;
  minSupportedVersion: string;
}

export function UpdateAvailableBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkUpdate = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/system/check-update`);
      if (res.ok) {
        const data = await res.json();
        if (data.latestVersion) {
          setUpdate(data);
        } else {
          setUpdate(null);
        }
      }
    } catch {
      // Silent — banner won't show
    }
  }, []);

  useEffect(() => {
    checkUpdate();
    const interval = setInterval(checkUpdate, 60 * 60 * 1000); // hourly
    return () => clearInterval(interval);
  }, [checkUpdate]);

  // Dismiss persists via localStorage keyed by version
  if (!update || dismissed) return null;

  const dismissedKey = `update-dismissed-${update.latestVersion}`;
  const stored = localStorage.getItem(dismissedKey);
  if (stored === "true") return null;

  function handleDismiss() {
    localStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  }

  return (
    <div
      role="alert"
      className={`sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 ${
        update.isCritical
          ? "bg-warning/10 border-warning/20"
          : "bg-muted border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <ArrowUpCircle
          className={`h-4 w-4 ${update.isCritical ? "text-amber-400" : "text-primary"}`}
        />
        <span className={update.isCritical ? "text-amber-400" : "text-foreground"}>
          {update.isCritical ? (
            <>
              <span className="mr-2 inline-flex items-center rounded-md bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
                Critique
              </span>
              Mise à jour critique disponible : {update.latestVersion}
            </>
          ) : (
            `Une mise à jour est disponible : ${update.latestVersion}`
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={update.changelogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          Voir le journal des modifications
        </a>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-white"
          aria-label="Ignorer la mise à jour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
