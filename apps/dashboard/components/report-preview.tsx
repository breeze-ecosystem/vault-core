"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { FileText, Download, X, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { itemVariants } from "@/components/page-transition";

interface ReportPreviewProps {
  reportId: string;
  onDownload: () => void;
  onClose: () => void;
  type?: string;
  date?: string;
  size?: string;
  loading?: boolean;
}

export function ReportPreview({
  reportId,
  onDownload,
  onClose,
  type = "Rapport hebdomadaire",
  date = new Date().toLocaleDateString("fr-FR"),
  size = "—",
  loading = false,
}: ReportPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Préparation du rapport...
            </p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{type}</h3>
              <div className="mt-1 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  Date : {date}
                </p>
                <p className="text-xs text-muted-foreground">
                  Taille : {size}
                </p>
                <p className="text-xs text-muted-foreground">
                  Réf : {reportId.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-center">
          <FileText className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aperçu non disponible
          </p>
          <p className="text-xs text-muted-foreground">
            Téléchargez le fichier PDF pour le consulter
          </p>
        </div>

        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="mt-4 w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Téléchargement..." : "Télécharger le rapport"}
        </Button>
      </GlassCard>
    </motion.div>
  );
}
