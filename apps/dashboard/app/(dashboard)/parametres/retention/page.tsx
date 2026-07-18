"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  fetchRetentionPolicies,
  createRetentionPolicy,
  updateRetentionPolicy,
  getSites,
  type RetentionPolicyDto,
  type Site,
} from "@/lib/api";
import { RetentionConfigForm } from "@/components/retention-config-form";

export default function RetentionPage() {
  const [policies, setPolicies] = useState<RetentionPolicyDto[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policiesData, sitesData] = await Promise.all([
        fetchRetentionPolicies(),
        getSites({ page: 1, limit: 100 }),
      ]);
      setPolicies(policiesData);
      setSites(sitesData.data);
    } catch (err: any) {
      setError(err.message || "Échec du chargement des paramètres de rétention");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (updatedPolicies: RetentionPolicyDto[]) => {
    // For each policy in the update: create if new, update if existing
    for (const policy of updatedPolicies) {
      const existing = policies.find(
        (p) => p.eventType === policy.eventType && p.tableType === policy.tableType,
      );
      if (existing) {
        await updateRetentionPolicy(existing.id, {
          retentionDays: policy.retentionDays,
          enabled: policy.enabled,
        });
      } else {
        await createRetentionPolicy({
          eventType: policy.eventType,
          tableType: policy.eventType,
          retentionDays: policy.retentionDays,
          enabled: policy.enabled,
        });
      }
    }
    // Reload after save
    const [policiesData, sitesData] = await Promise.all([
      fetchRetentionPolicies(),
      getSites({ page: 1, limit: 100 }),
    ]);
    setPolicies(policiesData);
    setSites(sitesData.data);
  };

  // Skeleton loading state
  if (loading) {
    return (
      <PageTransition>
        <div>
          <PageHeader
            title="Rétention avancée"
            description="Configuration de la rétention par site et par type d'événement"
          />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-6">
                <Skeleton className="mb-3 h-5 w-48" />
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </GlassCard>
            ))}
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
          <PageHeader
            title="Rétention avancée"
            description="Configuration de la rétention par site et par type d'événement"
          />
          <GlassCard className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
            <p className="text-base font-medium">
              Échec du chargement des paramètres de rétention
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  // Empty state — no sites configured
  if (sites.length === 0) {
    return (
      <PageTransition>
        <div>
          <PageHeader
            title="Rétention avancée"
            description="Configuration de la rétention par site et par type d'événement"
          />
          <GlassCard className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">Aucune configuration de rétention</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez un site pour configurer les politiques de rétention.
            </p>
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Rétention avancée"
          description="Configuration de la rétention par site et par type d'événement"
        />
        <RetentionConfigForm
          data={policies}
          sites={sites}
          onSave={handleSave}
        />
      </div>
    </PageTransition>
  );
}
