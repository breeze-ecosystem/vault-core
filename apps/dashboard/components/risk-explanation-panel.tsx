"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskGauge } from "@/components/risk-gauge";
import { explainRisk, type RiskExplanation } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RiskExplanationPanelProps {
  zoneId: string;
  zoneName: string;
  currentScore: number;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function RiskExplanationPanel({
  zoneId,
  zoneName,
  currentScore,
  isOpen,
  onClose,
  className,
}: RiskExplanationPanelProps) {
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);
    setExplanation(null);

    explainRisk(zoneId)
      .then((result) => {
        setExplanation(result);
      })
      .catch((err: Error) => {
        setError(err.message || "Impossible d'expliquer ce score pour le moment.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, zoneId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className={cn(
            "rounded-t-2xl border border-border/40 bg-card/95 backdrop-blur-md shadow-xl",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">
                Explication du score{" "}
                <span className="text-primary">{zoneName}</span>
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Fermer l'explication"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Gauge */}
            <div className="flex justify-center mb-4">
              <RiskGauge
                score={currentScore}
                zoneName={zoneName}
                size={180}
              />
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyse du score de la zone {zoneName}...
                </p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center gap-3 py-6">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-center text-muted-foreground">
                  {error}
                </p>
                <p className="text-xs text-muted-foreground">
                  Réessayer.
                </p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && !explanation && (
              <p className="text-sm text-center text-muted-foreground py-6">
                Aucun événement récent n&apos;explique ce score. Il reflète
                l&apos;état de base de la zone.
              </p>
            )}

            {/* Explanation content */}
            {explanation && (
              <div className="space-y-4">
                {/* AI Summary */}
                {explanation.aiSummary && (
                  <div className="rounded-lg bg-primary/[0.04] border border-primary/[0.12] p-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {explanation.aiSummary}
                    </p>
                  </div>
                )}

                {/* Score Breakdown */}
                {explanation.scoreBreakdown && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Décomposition du score
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(explanation.scoreBreakdown).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground">{key}</span>
                            <span className="font-mono font-medium">
                              {(value as number).toFixed(1)}%
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Contributing Events */}
                {explanation.contributingEvents &&
                  explanation.contributingEvents.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Événements contributeurs
                      </h4>
                      <div className="space-y-2">
                        {explanation.contributingEvents.map((event, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="warning" className="text-[10px]">
                                  {event.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.time).toLocaleTimeString(
                                    "fr-FR",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </span>
                              </div>
                              <p className="text-xs mt-0.5">
                                {event.description}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                Impact: {event.impact}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Recommendations */}
                {explanation.recommendations &&
                  explanation.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Recommandations
                      </h4>
                      <div className="space-y-1">
                        {explanation.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="text-primary mt-1">•</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
