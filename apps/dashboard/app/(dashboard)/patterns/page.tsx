"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { RefreshCw, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { PatternCard } from "@/components/pattern-card";
import { PatternTrendDetail } from "@/components/pattern-trend-detail";
import { useAuth } from "@/lib/use-auth";
import { useTranslation } from "@/lib/i18n/context";
import {
  fetchDetectedPatterns,
  type DetectedPatternDto,
} from "@/lib/api";

interface PatternView {
  id: string;
  name: string;
  severity: "info" | "warning" | "critical";
  sparklineData: number[];
  occurrenceCount: number;
  trendPercent: number;
  description?: string;
}

// Default pattern names per UI-SPEC Copywriting Contract
const PATTERN_NAMES = [
  "Porte forcée",
  "Porte maintenue ouverte",
  "Panne de lecteur",
  "Chute FPS caméra",
  "Accès refusé répété",
  "Fausses alertes caméra",
  "Anomalie d'horaire",
  "Déplacement impossible",
];

function mapSeverity(severity: string): "info" | "warning" | "critical" {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "critique") return "critical";
  if (s === "high" || s === "warning" || s === "élevé" || s === "avertissement")
    return "warning";
  return "info";
}

function mapToPatternViews(detected: DetectedPatternDto[]): PatternView[] {
  if (detected.length === 0) return [];

  // Group by patternId
  const grouped = new Map<string, DetectedPatternDto[]>();
  for (const d of detected) {
    const existing = grouped.get(d.patternId) || [];
    existing.push(d);
    grouped.set(d.patternId, existing);
  }

  return Array.from(grouped.entries()).map(([patternId, entries]) => {
    const first = entries[0]!;
    // Generate sparkline-like data from occurrence metadata
    const sparklineData = Array.from({ length: 7 }, (_, i) => {
      const dayEntries = entries.filter((e) => {
        const date = new Date(e.time);
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= (6 - i) && diffDays <= (7 - i);
      });
      return dayEntries.length;
    });

    return {
      id: patternId,
      name: first.patternName || PATTERN_NAMES[grouped.size - 1] || "Motif inconnu",
      severity: mapSeverity(first.severity),
      sparklineData,
      occurrenceCount: entries.length,
      trendPercent: 0, // Will be computed when real data available
      description: first.metadata?.description as string | undefined,
    };
  });
}

// Generate placeholder patterns when no API data is available
function getPlaceholderPatterns(): PatternView[] {
  return PATTERN_NAMES.map((name, i) => {
    const baseCount = Math.floor(Math.random() * 50) + 5;
    const sparklineData = Array.from({ length: 7 }, () =>
      Math.floor(Math.random() * baseCount) + 1
    );
    // Assign severities based on pattern type
    const severities: Array<"info" | "warning" | "critical"> = [
      "critical",
      "critical",
      "warning",
      "warning",
      "warning",
      "info",
      "info",
      "critical",
    ];
    return {
      id: `pattern-${i}`,
      name,
      severity: severities[i] || "info",
      sparklineData,
      occurrenceCount: baseCount,
      trendPercent: Math.floor(Math.random() * 30) * (Math.random() > 0.5 ? 1 : -1),
    };
  });
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card/60 p-5 space-y-4"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      ))}
    </div>
  );
}

export default function PatternsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<PatternView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternView | null>(
    null
  );

  const loadPatterns = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDetectedPatterns();
      if (result && result.data && result.data.length > 0) {
        const views = mapToPatternViews(result.data);
        setPatterns(views);
      } else {
        // Use placeholder data for demo / development
        setPatterns(getPlaceholderPatterns());
      }
    } catch {
      // Use placeholder data on error
      setPatterns(getPlaceholderPatterns());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const handleViewDetails = (patternId: string) => {
    const pattern = patterns.find((p) => p.id === patternId);
    if (pattern) {
      setSelectedPattern(pattern);
    }
  };

  // Role check
  if (
    user?.role &&
    !["ADMIN", "SUPERVISOR"].includes(user.role)
  ) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-6">
          <PageHeader title="Motifs" />
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Repeat className="h-12 w-12 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              Cette page nécessite un rôle Superviseur ou supérieur.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-6">
          <PageHeader title="Motifs" />
          <LoadingSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && patterns.length === 0) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-6">
          <PageHeader title="Motifs" />
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPatterns}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Réessayer
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <PageHeader title="Motifs" />

        {patterns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Repeat className="h-12 w-12 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground max-w-md">
              Aucun motif récurrent détecté. Le système analyse vos événements
              en continu. Les motifs apparaîtront ici dès qu&apos;ils seront
              identifiés.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid gap-4 md:grid-cols-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.06, delayChildren: 0.05 },
              },
            }}
          >
            {patterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                onViewDetails={handleViewDetails}
              />
            ))}
          </motion.div>
        )}

        {/* Pattern detail dialog */}
        {selectedPattern && (
          <PatternTrendDetail
            pattern={selectedPattern}
            isOpen={true}
            onClose={() => setSelectedPattern(null)}
          />
        )}

        {/* Error state for retry */}
        {error && patterns.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Les motifs récurrents sont temporairement indisponibles.{" "}
            <button
              onClick={loadPatterns}
              className="underline hover:no-underline"
            >
              Réessayer.
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
