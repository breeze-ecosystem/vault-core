"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { fetchApiKeys, revokeApiKey, type ApiKey } from "@/lib/api";
import { ApiKeyTable } from "@/components/api-keys/ApiKeyTable";
import { ApiKeyCreateForm } from "@/components/api-keys/ApiKeyCreateForm";
import { toast } from "@/components/ui/toast";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    setLoading(true);
    try {
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeApiKey(id);
      toast("Clé API révoquée", "success");
      loadKeys();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Clés API"
        description="Gérez les clés API pour l'intégration avec des services externes"
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => { setShowCreate(true); setCreatedKey(null); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle clé API
          </Button>
        </div>

        {createdKey && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <p className="mb-2 text-sm font-medium text-amber-500">
                Clé API créée
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                Copiez cette clé maintenant — elle ne sera plus affichée.
              </p>
              <code className="block rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                {createdKey}
              </code>
            </CardContent>
          </Card>
        )}

        {showCreate && (
          <ApiKeyCreateForm
            onCreated={(key) => {
              setShowCreate(false);
              setCreatedKey(key);
              loadKeys();
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clés API actives</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              <ApiTable keys={keys} onRevoke={handleRevoke} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApiTable({ keys, onRevoke }: { keys: ApiKey[]; onRevoke: (id: string) => void }) {
  if (keys.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune clé API configurée.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium">Préfixe</th>
            <th className="pb-2 font-medium">Statut</th>
            <th className="pb-2 font-medium">Limite</th>
            <th className="pb-2 font-medium">Dernière utilisation</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id} className="border-b last:border-0">
              <td className="py-3">{key.name}</td>
              <td className="py-3 font-mono text-xs">{key.keyPrefix}...</td>
              <td className="py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  key.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                }`}>
                  {key.isActive ? "Active" : "Révoquée"}
                </span>
              </td>
              <td className="py-3">{key.rateLimit}/min</td>
              <td className="py-3 text-muted-foreground">
                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Jamais"}
              </td>
              <td className="py-3">
                {key.isActive && (
                  <button
                    onClick={() => onRevoke(key.id)}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Révoquer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
