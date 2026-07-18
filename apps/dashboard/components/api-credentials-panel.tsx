"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Key, Plus, Copy, Trash2, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface ApiCredentialsPanelProps {
  tokens: ApiToken[];
  loading?: boolean;
  error?: string | null;
  onCreate: (name: string, expirationDays: number) => Promise<string | null>;
  onRevoke: (id: string) => Promise<void>;
  onRetry?: () => void;
}

export function ApiCredentialsPanel({
  tokens,
  loading = false,
  error = null,
  onCreate,
  onRevoke,
  onRetry,
}: ApiCredentialsPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState("");
  const [expirationDays, setExpirationDays] = useState("90");
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeConfirmText, setRevokeConfirmText] = useState("");

  const handleCreate = async () => {
    if (!newTokenName.trim()) return;
    setCreating(true);
    try {
      const token = await onCreate(newTokenName.trim(), parseInt(expirationDays, 10));
      if (token) {
        setCreatedToken(token);
        setNewTokenName("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!showRevokeDialog) return;
    setRevoking(true);
    try {
      await onRevoke(showRevokeDialog);
      setShowRevokeDialog(null);
      setRevokeConfirmText("");
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  // Loading state
  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium">Erreur de chargement</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Réessayer
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Clés API</h3>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Créer un token
          </Button>
        </div>

        {tokens.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Key className="h-8 w-8 text-muted-foreground opacity-40" />
            <div>
              <p className="text-sm font-medium">Aucun token API</p>
              <p className="text-xs text-muted-foreground">Créez un token pour intégrer vos systèmes tiers.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Créer un token
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{token.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {token.prefix}... · Créé le {new Date(token.createdAt).toLocaleDateString("fr-FR")}
                      {token.expiresAt && ` · Expire le ${new Date(token.expiresAt).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={token.isActive ? "success" : "secondary"} className="text-[10px]">
                    {token.isActive ? "Actif" : "Révoqué"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowRevokeDialog(token.id)}
                    title="Révoquer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setCreatedToken(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdToken ? "Token créé" : "Créer un token API"}</DialogTitle>
            <DialogDescription>
              {createdToken
                ? "Copiez ce token maintenant. Il ne sera plus affiché après fermeture."
                : "Créez un nouveau token d'API pour les intégrations tierces."}
            </DialogDescription>
          </DialogHeader>

          {createdToken ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <code className="break-all text-xs font-mono">{createdToken}</code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(createdToken)}
                    title="Copier"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Copiez-le maintenant, il ne sera plus affiché
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  setShowCreateDialog(false);
                  setCreatedToken(null);
                }}
              >
                Fermer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Nom du token</Label>
                <Input
                  id="token-name"
                  placeholder="Ex: Intégration alarme incendie"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-expiration">Expiration</Label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                    <SelectItem value="180">180 jours</SelectItem>
                    <SelectItem value="365">1 an</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreate} disabled={!newTokenName.trim() || creating}>
                  {creating ? "Création..." : "Créer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeDialog !== null} onOpenChange={(open) => { if (!open) { setShowRevokeDialog(null); setRevokeConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer le token</DialogTitle>
            <DialogDescription>
              Tapez <strong>RÉVOQUER</strong> pour confirmer la révocation de ce token API. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder='Tapez "RÉVOQUER" pour confirmer'
              value={revokeConfirmText}
              onChange={(e) => setRevokeConfirmText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowRevokeDialog(null); setRevokeConfirmText(""); }}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={revokeConfirmText !== "RÉVOQUER" || revoking}
              >
                {revoking ? "Révocation..." : "Révoquer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
