"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { createTenantApiKey } from "@/lib/api";

interface ApiKeyCreateFormProps {
  onCreated: (key: string) => void;
  onCancel: () => void;
}

export function ApiKeyCreateForm({ onCreated, onCancel }: ApiKeyCreateFormProps) {
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState(300);
  const [saving, setSaving] = useState(false);
  const [scopes, setScopes] = useState<string[]>([
    "read:cameras",
    "read:doors",
    "read:alerts",
    "read:incidents",
    "read:events",
    "read:audit",
  ]);

  const allScopes = [
    "read:cameras",
    "read:doors",
    "read:alerts",
    "read:incidents",
    "read:events",
    "read:audit",
    "write:doors",
    "write:alerts",
    "write:incidents",
  ];

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Le nom est requis", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await createTenantApiKey({ name: name.trim(), rateLimit, scopes });
      onCreated(result.rawKey);
      toast("Clé API créée avec succès", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nouvelle clé API</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Nom</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ma clé API"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Limite de requêtes (par minute)</label>
            <input
              type="number"
              min={1}
              max={10000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {allScopes.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-input"
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer la clé"}
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
