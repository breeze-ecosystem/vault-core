"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiCredentialsPanel, type ApiToken } from "@/components/api-credentials-panel";
import { WebhookSubscriptionList, type WebhookDto } from "@/components/webhook-subscription-list";
import { GlassCard } from "@/components/glass-card";
import { FileText, ExternalLink } from "lucide-react";

// Placeholder API client functions — will connect when API endpoints exist
const mockTokens: ApiToken[] = [];
const mockWebhooks: WebhookDto[] = [];

export default function ApiSettingsPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<ApiToken[]>(mockTokens);
  const [webhooks, setWebhooks] = useState<WebhookDto[]>(mockWebhooks);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Connect to real API endpoints when available
      setTokens(mockTokens);
      setWebhooks(mockWebhooks);
    } catch (err: any) {
      setError(err.message || "Échec du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateToken = async (name: string, expirationDays: number): Promise<string | null> => {
    // TODO: Connect to real API
    return "oh_sample_token_value_do_not_use_in_production";
  };

  const handleRevokeToken = async (id: string) => {
    // TODO: Connect to real API
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeleteWebhook = async (id: string) => {
    // TODO: Connect to real API
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const handleTestWebhook = async (id: string) => {
    // TODO: Connect to real API
    // placeholder
  };

  const openSwagger = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    window.open(`${apiUrl}/api/docs`, "_blank");
  };

  const downloadIntegrationGuide = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    window.open(`${apiUrl}/api/compliance/integration-guide`, "_blank");
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="API & Webhooks"
          description="Gérez vos clés API et abonnements webhook pour les intégrations tierces."
        />

        <Tabs defaultValue="tokens" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tokens">Clés API</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="tokens">
            <ApiCredentialsPanel
              tokens={tokens}
              loading={loading}
              error={error}
              onCreate={handleCreateToken}
              onRevoke={handleRevokeToken}
              onRetry={loadData}
            />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookSubscriptionList
              webhooks={webhooks}
              loading={loading}
              error={error}
              onEdit={(id) => router.push(`/parametres/api/webhooks/${id}`)}
              onDelete={handleDeleteWebhook}
              onTest={handleTestWebhook}
              onAdd={() => router.push("/parametres/api/webhooks/nouveau")}
            />
          </TabsContent>

          <TabsContent value="documentation">
            <GlassCard className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Documentation interactive (Swagger)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Explorez tous les endpoints API avec leur documentation interactive.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={openSwagger}>
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Ouvrir Swagger
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Guide d'intégration PDF</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Guide complet avec authentification, références d'endpoints, types d'événements webhook et exemples de code.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadIntegrationGuide}>
                    <FileText className="mr-2 h-3 w-3" />
                    Télécharger le PDF
                  </Button>
                </div>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
