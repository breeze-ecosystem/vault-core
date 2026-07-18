"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { CrossSiteComparison } from "@/components/cross-site-comparison";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { getComparisonData, type ComparisonData } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ComparaisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");

  const loadData = useCallback(async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getComparisonData(selectedPeriod);
      setData(result);
    } catch (e: any) {
      setError(e.message || "La comparaison inter-sites est temporairement indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [loadData, period]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Comparaison inter-sites"
          description="Comparez les métriques entre vos sites de surveillance"
        />

        {/* Period selector */}
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
          {(["today", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "today" ? "Aujourd'hui" : p === "7d" ? "7 jours" : "30 jours"}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
            <p className="mb-2 text-lg font-medium">Erreur de comparaison</p>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <Button variant="default" onClick={() => loadData(period)}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Empty / insufficient data */}
        {!loading && !error && data && data.sites.length < 2 && (
          <div className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium">Aucune donnée disponible</p>
            <p className="text-sm text-muted-foreground">
              Ajoutez au moins 2 sites pour activer la comparaison inter-sites.
            </p>
          </div>
        )}

        {/* Data */}
        {!loading && !error && data && data.sites.length >= 2 && (
          <CrossSiteComparison data={data} />
        )}
      </div>
    </PageTransition>
  );
}
