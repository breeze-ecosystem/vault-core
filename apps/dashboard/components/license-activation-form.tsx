"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Copy, ExternalLink } from "lucide-react";

interface LicenseActivationFormProps {
  onSubmit: (jwt: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  result: any;
}

export function LicenseActivationForm({ onSubmit, loading, error, result }: LicenseActivationFormProps) {
  const [jwt, setJwt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jwt.trim() || loading) return;
    await onSubmit(jwt.trim());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jwt).catch(() => {});
  };

  // Already activated case
  if (result?.alreadyActivated) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          <div>
            <h3 className="font-semibold">Licence déjà activée</h3>
            <p className="text-sm text-muted-foreground">
              Cette organisation a déjà une licence active.
            </p>
            <a
              href="/parametres"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Voir le statut de la licence
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (result && !result.alreadyActivated) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold">Licence activée avec succès</h3>
            <p className="text-sm text-muted-foreground">
              Votre licence est active jusqu&apos;au{" "}
              {result.claims?.expiresAt
                ? new Date(result.claims.expiresAt).toLocaleDateString("fr-FR")
                : "—"}
              . Vous pouvez utiliser jusqu&apos;à{" "}
              {result.claims?.maxCameras ?? "—"} caméras et{" "}
              {result.claims?.maxDoors ?? "—"} portes.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Caméras</span>
            <p className="font-mono font-medium">{result.claims?.maxCameras ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Portes</span>
            <p className="font-mono font-medium">{result.claims?.maxDoors ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date d&apos;expiration</span>
            <p className="font-mono font-medium">
              {result.claims?.expiresAt
                ? new Date(result.claims.expiresAt).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Organisation</span>
            <p className="font-mono font-medium">
              {result.claims?.organizationId?.substring(0, 8) ?? "—"}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="license-jwt" className="mb-1 block text-sm font-medium">
          Clé de licence
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Collez la clé JWT fournie par votre administrateur pour activer votre licence.
        </p>
        <textarea
          id="license-jwt"
          value={jwt}
          onChange={(e) => setJwt(e.target.value)}
          placeholder="Collez votre clé de licence JWT ici"
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          rows={4}
          disabled={loading}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Clé de licence invalide</p>
              <p className="text-destructive/80">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!jwt.trim() || loading}>
          {loading ? "Vérification..." : "Activer la licence"}
        </Button>
        {jwt && (
          <Button type="button" variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copier
          </Button>
        )}
      </div>
    </form>
  );
}
