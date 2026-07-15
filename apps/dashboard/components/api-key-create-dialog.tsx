"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { createApiKey } from "@/lib/api";

interface ApiKeyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (rawKey: string) => void;
}

export function ApiKeyCreateDialog({ open, onOpenChange, onCreated }: ApiKeyCreateDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{ rawKey: string; keyPrefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createApiKey(name.trim());
      setCreatedKey({ rawKey: result.rawKey, keyPrefix: result.keyPrefix });
      onCreated(result.rawKey);
      toast("Clé API générée avec succès", "success");
    } catch (e: any) {
      setError(e.message || "Échec de la création de la clé API");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.rawKey);
      setCopied(true);
      toast("Clé copiée dans le presse-papier", "success");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast("Impossible de copier la clé", "error");
    }
  };

  const handleClose = () => {
    if (!createdKey) {
      onOpenChange(false);
      return;
    }
    // Key already shown, permanently close
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setName("");
      setCreatedKey(null);
      setError(null);
      setCopied(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "Clé API générée" : "Créer une clé API"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "La clé API ne sera affichée qu'une seule fois. Copiez-la immédiatement et stockez-la de façon sécurisée."
              : "Créez une clé API pour utiliser l'API REST de génération de licences."}
          </DialogDescription>
        </DialogHeader>

        {!createdKey ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nom de la clé
              </label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ex: Licence API production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button onClick={handleCreate} disabled={!name.trim() || loading}>
              {loading ? "Génération..." : "Générer la clé"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Conservez cette clé en lieu sûr</p>
                <p className="mt-1">
                  La clé API ne sera affichée qu&apos;une seule fois. Copiez-la immédiatement et stockez-la de façon sécurisée.
                </p>
              </div>
            </div>

            <div className="relative">
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 font-mono text-xs">
                {createdKey.rawKey}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier la clé
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
