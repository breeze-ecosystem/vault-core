"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HapdpWizard } from "@/components/hapdp-wizard";
import { toast } from "@/components/ui/toast";
import { Shield, CheckCircle, AlertCircle, Play } from "lucide-react";

export default function HapdpCompliancePage() {
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleWizardComplete = useCallback(() => {
    setConfigured(true);
    setShowWizard(false);
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <PageHeader
            title="Conformité HAPDP"
            description="Assistant de mise en conformité HAPDP (Niger)"
          />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <PageHeader
            title="Conformité HAPDP"
            description="Assistant de mise en conformité HAPDP (Niger)"
          />
          <GlassCard className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
            <p className="mb-2 text-lg font-medium text-destructive">
              Erreur de chargement
            </p>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setLoading(true);
                setTimeout(() => setLoading(false), 500);
              }}
            >
              Réessayer
            </Button>
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  if (showWizard) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <PageHeader
            title="Conformité HAPDP"
            description="Assistant de mise en conformité"
          />
          <HapdpWizard
            onComplete={handleWizardComplete}
            onClose={() => setShowWizard(false)}
          />
        </div>
      </PageTransition>
    );
  }

  if (configured) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <PageHeader
            title="Conformité HAPDP"
            description="Assistant de mise en conformité HAPDP (Niger)"
          />
          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Module HAPDP configuré
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Votre organisation est en conformité avec les exigences
                  HAPDP. La déclaration a été générée avec succès.
                </p>
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowWizard(true)}
                  >
                    Modifier la configuration
                  </Button>
                  <Button
                    onClick={() => {
                      toast.success(
                        "Téléchargement de la déclaration",
                      );
                    }}
                  >
                    Télécharger la déclaration
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  // Empty state (not configured)
  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Conformité HAPDP"
          description="Assistant de mise en conformité HAPDP (Niger)"
        />

        <GlassCard className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-14 w-14 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">
            Module HAPDP non configuré
          </h2>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            L&apos;assistant vous guide à travers les 6 étapes de mise en
            conformité avec la réglementation HAPDP : déclaration des
            traitements, signalétique consentement, pseudonymisation, et
            portail d&apos;accès aux données.
          </p>
          <Button size="lg" onClick={() => setShowWizard(true)}>
            <Play className="mr-2 h-4 w-4" />
            Démarrer le wizard
          </Button>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
