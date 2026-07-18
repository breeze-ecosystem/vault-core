"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  Download,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { containerVariants, itemVariants } from "@/components/page-transition";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ProcessingRecord {
  id: string;
  eventType: string;
  entity: string;
  action: string;
  performedBy: string;
  date: string;
  details?: string;
}

interface ProcessingRegisterTableProps {
  entries: ProcessingRecord[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
    entityType?: string;
  };
  onFilterChange: (f: any) => void;
  onExport: (format: "csv" | "pdf") => Promise<void>;
}

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "enregistrement", label: "Enregistrement" },
  { value: "consultation", label: "Consultation" },
  { value: "modification", label: "Modification" },
  { value: "suppression", label: "Suppression" },
  { value: "export", label: "Export" },
];

const ITEMS_PER_PAGE = 10;

export function ProcessingRegisterTable({
  entries,
  loading = false,
  error = null,
  onRetry,
  filters,
  onFilterChange,
  onExport,
}: ProcessingRegisterTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  // Filter and search
  const filtered = entries.filter((e) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !e.eventType.toLowerCase().includes(q) &&
        !e.entity.toLowerCase().includes(q) &&
        !e.action.toLowerCase().includes(q) &&
        !e.performedBy.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filters.eventType && e.eventType !== filters.eventType) return false;
    if (filters.dateFrom && e.date < filters.dateFrom) return false;
    if (filters.dateTo && e.date > filters.dateTo) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedEntries = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      await onExport(format);
      toast.success(
        format === "csv" ? "Export CSV téléchargé" : "Export PDF téléchargé",
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        variants={itemVariants}
        className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12"
      >
        <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
        <p className="mb-2 text-lg font-medium text-destructive">
          Erreur de chargement
        </p>
        <p className="mb-6 text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <select
          value={filters.eventType || ""}
          onChange={(e) =>
            onFilterChange({ ...filters, eventType: e.target.value || undefined })
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("csv")}
          disabled={exporting !== null}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting === "csv" ? "Export..." : "Exporter en CSV"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("pdf")}
          disabled={exporting !== null}
        >
          <FileText className="mr-2 h-4 w-4" />
          {exporting === "pdf" ? "Export..." : "Exporter en PDF"}
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-10">
          <Search className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucune activité enregistrée
          </p>
          <p className="text-xs text-muted-foreground">
            Aucune opération de traitement trouvée pour les critères
            sélectionnés
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Type d&apos;événement
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Entité
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Effectué par
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {entry.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.entity}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.performedBy}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""} —
                page {page}/{totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </motion.div>
  );
}
