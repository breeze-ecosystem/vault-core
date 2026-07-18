"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WebhookEventSelector, type EventTypeCategory } from "@/components/webhook-event-selector";
import { ArrowLeft, Save } from "lucide-react";

const EVENT_TYPES: EventTypeCategory[] = [
  {
    category: "Alertes",
    events: [
      { key: "bastion.alert_created", label: "Alerte créée", description: "Quand une nouvelle alerte est générée" },
      { key: "bastion.alert_resolved", label: "Alerte résolue", description: "Quand une alerte est marquée comme résolue" },
    ],
  },
  {
    category: "Accès",
    events: [
      { key: "bastion.access_granted", label: "Accès autorisé", description: "Quand un accès est accordé" },
      { key: "bastion.access_denied", label: "Accès refusé", description: "Quand un accès est refusé" },
      { key: "bastion.door_forced", label: "Porte forcée", description: "Quand une porte est forcée" },
    ],
  },
  {
    category: "IA",
    events: [
      { key: "bastion.ai_detection", label: "Détection IA", description: "Détection IA générique" },
      { key: "bastion.face_match", label: "Correspondance visage", description: "Quand un visage est reconnu" },
      { key: "bastion.weapon_detected", label: "Arme détectée", description: "Quand une arme est détectée" },
    ],
  },
  {
    category: "Conformité",
    events: [
      { key: "bastion.compliance_event", label: "Événement conformité", description: "Événements liés à la conformité HAPDP" },
      { key: "bastion.subject_access_request", label: "Demande d'accès sujet", description: "Quand une demande d'accès est soumise" },
    ],
  },
  {
    category: "Intégrations",
    events: [
      { key: "bastion.fire_alarm", label: "Alarme incendie", description: "Quand une alarme incendie est reçue" },
      { key: "bastion.bms_event", label: "Événement BMS", description: "Événements de gestion technique du bâtiment" },
    ],
  },
  {
    category: "Rapports & Sauvegardes",
    events: [
      { key: "bastion.report_ready", label: "Rapport prêt", description: "Quand un rapport est généré" },
      { key: "bastion.backup_completed", label: "Sauvegarde réussie", description: "Quand une sauvegarde est terminée" },
      { key: "bastion.backup_failed", label: "Sauvegarde échouée", description: "Quand une sauvegarde échoue" },
    ],
  },
];

export default function NouveauWebhookPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      // TODO: Call API
      router.push("/parametres/api");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div>
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => router.push("/parametres/api")}
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Retour
          </Button>
          <PageHeader
            title="Nouveau webhook"
            description="Créez un nouvel abonnement webhook pour recevoir les événements BASTION."
          />
        </div>

        <div className="space-y-6 max-w-2xl">
          <GlassCard className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">URL de livraison (HTTPS requis)</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://votre-serveur/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  L'URL doit utiliser HTTPS. Les adresses locales ne sont pas autorisées.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="webhook-active">Actif</Label>
                  <p className="text-xs text-muted-foreground">
                    Désactivez pour suspendre temporairement la livraison.
                  </p>
                </div>
                <Switch id="webhook-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </GlassCard>

          <div>
            <h3 className="text-sm font-semibold mb-3">Types d'événements</h3>
            <WebhookEventSelector
              eventTypes={EVENT_TYPES}
              selected={selectedEvents}
              onChange={setSelectedEvents}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/parametres/api")}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!url.trim() || selectedEvents.length === 0 || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Enregistrement..." : "Créer le webhook"}
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
