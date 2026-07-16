"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { createWebhookSubscription } from "@/lib/api";

interface WebhookSubscriptionFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function WebhookSubscriptionForm({ onCreated, onCancel }: WebhookSubscriptionFormProps) {
  const [eventType, setEventType] = useState("alert.created");
  const [targetUrl, setTargetUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const eventTypes = [
    "alert.created",
    "alert.acknowledged",
    "alert.resolved",
    "incident.created",
    "incident.escalated",
    "incident.resolved",
    "door.forced",
    "door.unlocked",
    "door.held",
    "access.denied",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrl.trim()) {
      toast("L'URL cible est requise", "error");
      return;
    }
    setSaving(true);
    try {
      await createWebhookSubscription({ eventType, targetUrl: targetUrl.trim() });
      toast("Abonnement webhook créé", "success");
      onCreated();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nouvel abonnement webhook</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Type d'événement</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {eventTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">URL cible</label>
            <input
              type="url"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer l'abonnement"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
