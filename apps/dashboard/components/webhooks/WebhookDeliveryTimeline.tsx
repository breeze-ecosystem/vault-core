"use client";

import { useState, useEffect } from "react";
import { fetchWebhookDeliveries, type WebhookDelivery } from "@/lib/api";

interface WebhookDeliveryTimelineProps {
  subscriptionId: string;
}

export function WebhookDeliveryTimeline({ subscriptionId }: WebhookDeliveryTimelineProps) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchWebhookDeliveries(subscriptionId)
      .then(setDeliveries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subscriptionId]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (deliveries.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune livraison pour cet abonnement.</p>;
  }

  return (
    <div className="space-y-2">
      {deliveries.map((delivery) => (
        <div key={delivery.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
            delivery.statusCode && delivery.statusCode < 300 ? "bg-green-500" : "bg-red-500"
          }`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">{delivery.eventType}</p>
              <span className="text-xs text-muted-foreground">
                tentative {delivery.attemptNumber}
              </span>
            </div>
            {delivery.statusCode && (
              <p className="text-xs text-muted-foreground">
                Statut HTTP: {delivery.statusCode}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(delivery.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
