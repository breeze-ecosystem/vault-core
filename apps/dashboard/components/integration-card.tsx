"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Building2, Settings, Trash2, RefreshCw } from "lucide-react";

export interface IntegrationEndpointDto {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  lastEventAt: string | null;
  createdAt: string;
  config?: Record<string, unknown>;
}

interface IntegrationCardProps {
  integration: IntegrationEndpointDto;
  onConfigure: (id: string, config: { targetUrl?: string; sharedSecret?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const INTEGRATION_META: Record<string, { icon: typeof Flame; label: string; description: string }> = {
  fire_alarm: {
    icon: Flame,
    label: "Alarme Incendie",
    description: "Réception des événements d'alarme incendie avec corrélation vidéo et création d'alertes.",
  },
  bms: {
    icon: Building2,
    label: "GTB / BMS",
    description: "Réception des événements de gestion technique du bâtiment (HVAC, éclairage, portes coupe-feu).",
  },
};

export function IntegrationCard({ integration, onConfigure, onDelete }: IntegrationCardProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = INTEGRATION_META[integration.type] || {
    icon: Building2,
    label: integration.name,
    description: "Intégration tierce configurée.",
  };
  const Icon = meta.icon;
  const isConnected = integration.isActive && integration.lastEventAt !== null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onConfigure(integration.id, { targetUrl, sharedSecret });
      setShowConfig(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(integration.id);
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <GlassCard className="p-5">
        <div className="flex items-start gap-4">
          <div className={`rounded-lg p-2.5 ${
            isConnected ? "bg-green-500/10" : "bg-muted"
          }`}>
            <Icon className={`h-5 w-5 ${
              isConnected ? "text-green-500" : "text-muted-foreground"
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold">{meta.label}</h4>
              <Badge variant={isConnected ? "success" : "secondary"} className="text-[10px]">
                {isConnected ? "Connecté" : "Déconnecté"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{meta.description}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowConfig(true)}>
                <Settings className="mr-1 h-3 w-3" />
                Configurer
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setShowDelete(true)}
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {integration.lastEventAt && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Dernier événement</p>
              <p className="text-xs font-medium">
                {new Date(integration.lastEventAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Configure Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurer {meta.label}</DialogTitle>
            <DialogDescription>
              Configurez les paramètres de connexion pour cette intégration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-url">URL cible (optionnelle)</Label>
              <Input
                id="target-url"
                placeholder="https://..."
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shared-secret">Clé partagée (optionnelle)</Label>
              <Input
                id="shared-secret"
                type="password"
                placeholder="Clé secrète pour X-Integration-Key"
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfig(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={(open) => { if (!open) { setShowDelete(false); setDeleteConfirm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'intégration</DialogTitle>
            <DialogDescription>
              Tapez <strong>RÉVOQUER</strong> pour confirmer la suppression de cette intégration.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder='Tapez "RÉVOQUER" pour confirmer'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirm !== "RÉVOQUER" || deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
