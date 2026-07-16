"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { fetchWebhookSubscriptions, type WebhookSubscription } from "@/lib/api";
import { WebhookSubscriptionForm } from "@/components/webhooks/WebhookSubscriptionForm";
import { WebhookDeliveryTimeline } from "@/components/webhooks/WebhookDeliveryTimeline";
import { toast } from "@/components/ui/toast";

export default function WebhooksPage() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  useEffect(() => { loadSubscriptions(); }, []);

  async function loadSubscriptions() {
    setLoading(true);
    try {
      const data = await fetchWebhookSubscriptions();
      setSubscriptions(data);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Gérez les abonnements webhook pour les notifications d'événements"
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel abonnement
          </Button>
        </div>

        {showCreate && (
          <WebhookSubscriptionForm
            onCreated={() => { setShowCreate(false); loadSubscriptions(); }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Abonnements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun abonnement webhook configuré.</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{sub.eventType}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">{sub.targetUrl}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          sub.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        }`}>
                          {sub.isActive ? "Actif" : "Inactif"}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setSelectedSub(selectedSub === sub.id ? null : sub.id)}>
                          {selectedSub === sub.id ? "Masquer" : "Livraisons"}
                        </Button>
                      </div>
                    </div>
                    {selectedSub === sub.id && (
                      <div className="mt-4">
                        <WebhookDeliveryTimeline subscriptionId={sub.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
