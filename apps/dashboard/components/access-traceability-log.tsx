"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  User,
  Calendar,
  Globe,
  Clock,
  FileText,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { containerVariants, itemVariants } from "@/components/page-transition";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
  requestPath?: string;
  changes?: Record<string, unknown>;
  details?: string;
}

interface AccessTraceabilityLogProps {
  entries: AuditEntry[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  filters: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    entityType?: string;
  };
  onFilterChange: (f: any) => void;
}

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "Toutes les entités" },
  { value: "user", label: "Utilisateur" },
  { value: "camera", label: "Caméra" },
  { value: "alert", label: "Alerte" },
  { value: "recording", label: "Enregistrement" },
  { value: "report", label: "Rapport" },
  { value: "config", label: "Configuration" },
];

export function AccessTraceabilityLog({
  entries,
  loading = false,
  error = null,
  onRetry,
  filters,
  onFilterChange,
}: AccessTraceabilityLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and search
  const filtered = entries.filter((e) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !e.userName.toLowerCase().includes(q) &&
        !(e.userEmail || "").toLowerCase().includes(q) &&
        !e.entityType.toLowerCase().includes(q) &&
        !e.action.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filters.userId && e.userId !== filters.userId) return false;
    if (filters.entityType && e.entityType !== filters.entityType) return false;
    if (filters.dateFrom && e.timestamp < filters.dateFrom) return false;
    if (filters.dateTo && e.timestamp > filters.dateTo) return false;
    return true;
  });

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
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
          <Input
            type="text"
            placeholder="Rechercher par utilisateur, entité..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) =>
              onFilterChange({ ...filters, dateFrom: e.target.value || undefined })
            }
            className="w-36"
            placeholder="Du"
          />
          <Input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) =>
              onFilterChange({ ...filters, dateTo: e.target.value || undefined })
            }
            className="w-36"
            placeholder="Au"
          />
        </div>
        <select
          value={filters.entityType || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              entityType: e.target.value || undefined,
            })
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Entry list */}
      {filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-10">
          <Search className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucun accès enregistré
          </p>
          <p className="text-xs text-muted-foreground">
            Aucune activité d&apos;accès aux données trouvée pour les critères
            sélectionnés
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <GlassCard key={entry.id} className="overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.id)
                  }
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/20"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      entry.action === "create"
                        ? "bg-success/10 text-success"
                        : entry.action === "delete"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary",
                    )}
                  >
                    {entry.action === "view" || entry.action === "read" ? (
                      <FileText className="h-4 w-4" />
                    ) : entry.action === "create" ? (
                      <FileText className="h-4 w-4" />
                    ) : entry.action === "delete" ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {entry.userName}
                      </span>
                      {entry.userEmail && (
                        <span className="text-xs text-muted-foreground truncate">
                          {entry.userEmail}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {entry.entityType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-4 py-3 space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Utilisateur :
                            </span>
                            <span className="font-medium">
                              {entry.userName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">IP :</span>
                            <span className="font-medium">
                              {entry.ipAddress || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Chemin :
                            </span>
                            <span className="font-medium font-mono text-xs">
                              {entry.requestPath || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Horodatage :
                            </span>
                            <span className="font-medium">
                              {new Date(
                                entry.timestamp,
                              ).toLocaleString("fr-FR")}
                            </span>
                          </div>
                        </div>

                        {entry.changes && (
                          <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                              Modifications :
                            </p>
                            <pre className="text-xs text-muted-foreground overflow-x-auto">
                              {JSON.stringify(entry.changes, null, 2)}
                            </pre>
                          </div>
                        )}

                        {entry.details && (
                          <p className="text-xs text-muted-foreground">
                            {entry.details}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
