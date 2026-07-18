"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { IntegrationCard, type IntegrationEndpointDto } from "@/components/integration-card";
import { Puzzle, Plus, AlertCircle, RefreshCw } from "lucide-react";

// Placeholder data
const mockIntegrations: IntegrationEndpointDto[] = [];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationEndpointDto[]>(mockIntegrations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Connect to real API
      setIntegrations(mockIntegrations);
    } catch (err: any) {
      setError(err.message || "Échec du chargement des intégrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfigure = async (id: string, config: { targetUrl?: string; sharedSecret?: string }) => {
    // TODO: Connect to real API
  };

  const handleDelete = async (id: string) => {
    // TODO: Connect to real API
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  };

  // Loading state
  if (loading) {
    return (
      <PageTransition>
        <div>
          <PageHeader title="Intégrations" description="Gérez vos intégrations tierces." />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (error) {
    return (
      <PageTransition>
        <div>
          <PageHeader title="Intégrations" description="Gérez vos intégrations tierces." />
          <GlassCard className="p-6">
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm font-medium">Erreur de chargement</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Réessayer
              </Button>
            </div>
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Intégrations"
          description="Configurez vos intégrations avec les systèmes tiers."
        />

        {integrations.length === 0 ? (
          <GlassCard className="p-6">
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <Puzzle className="h-12 w-12 text-muted-foreground opacity-30" />
              <div>
                <p className="text-sm font-medium">Aucune intégration</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Aucune intégration tierce configurée. Ajoutez une intégration pour connecter vos systèmes d'alarme incendie ou de gestion technique du bâtiment.
                </p>
              </div>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Ajouter une intégration
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConfigure={handleConfigure}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Empty state guides for available integrations */}
        {integrations.length === 0 && !loading && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-4">Intégrations disponibles</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <GlassCard className="p-5 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-orange-500/10 p-2.5">
                    <Puzzle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Alarme Incendie</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Réception des événements d'alarme incendie avec corrélation vidéo automatique.
                    </p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-5 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-blue-500/10 p-2.5">
                    <Puzzle className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">GTB / BMS</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gestion technique du bâtiment : HVAC, éclairage de secours, portes coupe-feu.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
