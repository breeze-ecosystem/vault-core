"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Webhook, Plus, Trash2, Send, AlertCircle, RefreshCw } from "lucide-react";

export interface WebhookDto {
  id: string;
  eventType: string;
  targetUrl: string;
  isActive: boolean;
  eventTypesCount: number;
  lastDeliveryStatus: string | null;
  createdAt: string;
}

interface WebhookSubscriptionListProps {
  webhooks: WebhookDto[];
  loading?: boolean;
  error?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
  onAdd: () => void;
}

export function WebhookSubscriptionList({
  webhooks,
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onTest,
  onAdd,
}: WebhookSubscriptionListProps) {
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null);

  const handleDelete = async () => {
    if (!deleteDialogId) return;
    setDeleting(true);
    try {
      await onDelete(deleteDialogId);
      setDeleteDialogId(null);
      setDeleteConfirmText("");
    } finally {
      setDeleting(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      await onTest(id);
      setTestResult({ id, success: true });
    } catch {
      setTestResult({ id, success: false });
    } finally {
      setTestingId(null);
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
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Abonnements Webhook</h3>
          </div>
          <Button size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-3 w-3" />
            Ajouter un webhook
          </Button>
        </div>

        {webhooks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Webhook className="h-8 w-8 text-muted-foreground opacity-40" />
            <div>
              <p className="text-sm font-medium">Aucun webhook configuré</p>
              <p className="text-xs text-muted-foreground">
                Créez un abonnement webhook pour recevoir les événements BASTION en temps réel.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="mr-1 h-3 w-3" />
              Ajouter un webhook
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{wh.targetUrl}</p>
                    <Badge variant={wh.isActive ? "success" : "secondary"} className="text-[10px] shrink-0">
                      {wh.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {wh.eventTypesCount} type(s) d'événement · 
                    Dernière livraison: {wh.lastDeliveryStatus || "Aucune"}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                  >
                    <Send className="mr-1 h-3 w-3" />
                    {testingId === wh.id ? "..." : "Test"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteDialogId(wh.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {testResult && (
          <div className={`mt-3 rounded-lg border p-3 text-sm ${
            testResult.success ? "border-green-500/30 bg-green-500/5 text-green-600" : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}>
            {testResult.success ? "✓ Test reçu avec succès" : "✗ Échec de livraison"}
          </div>
        )}
      </GlassCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogId !== null} onOpenChange={(open) => { if (!open) { setDeleteDialogId(null); setDeleteConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le webhook</DialogTitle>
            <DialogDescription>
              Tapez le nom du webhook pour confirmer la suppression. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder='Tapez "Supprimer le webhook" pour confirmer'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDeleteDialogId(null); setDeleteConfirmText(""); }}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirmText !== "Supprimer le webhook" || deleting}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
