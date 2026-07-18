"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { exportClip } from "@/lib/api";

type ClipState = "idle" | "loading" | "ready" | "error";

interface ClipExportButtonProps {
  eventId: string;
  disabled?: boolean;
}

export function ClipExportButton({ eventId, disabled }: ClipExportButtonProps) {
  const [state, setState] = useState<ClipState>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      const result = await exportClip(eventId);
      setDownloadUrl(result.downloadUrl);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [eventId, state]);

  function handleDownload() {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
      setState("idle");
      setDownloadUrl(null);
    }
  }

  function handleRetry() {
    setState("idle");
    setDownloadUrl(null);
  }

  return (
    <div className="flex items-center gap-2">
      {state === "idle" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={disabled}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Exporter le clip (30s)
        </Button>
      )}

      {state === "loading" && (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          Préparation de l&apos;export...
        </Button>
      )}

      {state === "ready" && (
        <Button variant="default" size="sm" onClick={handleDownload}>
          <CheckCircle className="mr-1.5 h-4 w-4" />
          Télécharger le clip
        </Button>
      )}

      {state === "error" && (
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={handleRetry}>
            <AlertCircle className="mr-1.5 h-4 w-4" />
            Réessayer
          </Button>
          <span className="text-xs text-destructive">Erreur d&apos;export</span>
        </div>
      )}
    </div>
  );
}
