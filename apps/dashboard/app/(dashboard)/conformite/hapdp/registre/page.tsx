"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { ProcessingRegisterTable } from "@/components/processing-register-table";

interface ProcessingRecord {
  id: string;
  eventType: string;
  entity: string;
  action: string;
  performedBy: string;
  date: string;
  details?: string;
}

const MOCK_ENTRIES: ProcessingRecord[] = [
  {
    id: "1",
    eventType: "enregistrement",
    entity: "Visage - Jean Dupont",
    action: "Création",
    performedBy: "Admin",
    date: "2026-07-18T10:30:00Z",
  },
  {
    id: "2",
    eventType: "consultation",
    entity: "Alerte intrusion #4521",
    action: "Lecture",
    performedBy: "Marie Koné",
    date: "2026-07-18T09:15:00Z",
  },
  {
    id: "3",
    eventType: "modification",
    entity: "Configuration caméra CAM-012",
    action: "Mise à jour",
    performedBy: "Admin",
    date: "2026-07-17T16:45:00Z",
  },
  {
    id: "4",
    eventType: "export",
    entity: "Rapport hebdomadaire",
    action: "Téléchargement",
    performedBy: "Ibrahim Diallo",
    date: "2026-07-17T14:00:00Z",
  },
  {
    id: "5",
    eventType: "suppression",
    entity: "Visiteur - Paul Martin",
    action: "Suppression",
    performedBy: "Admin",
    date: "2026-07-16T11:20:00Z",
  },
  {
    id: "6",
    eventType: "enregistrement",
    entity: "Badge ACC-8823",
    action: "Création",
    performedBy: "Fatima Ousmane",
    date: "2026-07-16T09:00:00Z",
  },
  {
    id: "7",
    eventType: "consultation",
    entity: "Liste noire visages",
    action: "Lecture",
    performedBy: "Marie Koné",
    date: "2026-07-15T15:30:00Z",
  },
  {
    id: "8",
    eventType: "modification",
    entity: "Zone accès ZN-003",
    action: "Mise à jour",
    performedBy: "Ibrahim Diallo",
    date: "2026-07-15T10:00:00Z",
  },
  {
    id: "9",
    eventType: "export",
    entity: "Preuves médico-légales",
    action: "Export PDF",
    performedBy: "Admin",
    date: "2026-07-14T17:00:00Z",
  },
  {
    id: "10",
    eventType: "consultation",
    entity: "Enregistrement REC-3321",
    action: "Lecture vidéo",
    performedBy: "Fatima Ousmane",
    date: "2026-07-14T13:45:00Z",
  },
  {
    id: "11",
    eventType: "enregistrement",
    entity: "Visiteur - Sarah Ahmed",
    action: "Création",
    performedBy: "Admin",
    date: "2026-07-13T08:30:00Z",
  },
  {
    id: "12",
    eventType: "suppression",
    entity: "Alerte obsolète #4500",
    action: "Suppression",
    performedBy: "Ibrahim Diallo",
    date: "2026-07-13T07:00:00Z",
  },
];

export default function ProcessingRegisterPage() {
  const [entries, setEntries] = useState<ProcessingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
    entityType?: string;
  }>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call — would be replaced with:
      // const result = await fetchProcessingRegister(filters);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setEntries(MOCK_ENTRIES);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (format: "csv" | "pdf") => {
    // Would call exportApi({ format, ...filters })
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Registre des traitements"
          description="Registre des activités de traitement des données personnelles"
        />

        <ProcessingRegisterTable
          entries={entries}
          loading={loading}
          error={error}
          onRetry={loadData}
          filters={filters}
          onFilterChange={setFilters}
          onExport={handleExport}
        />
      </div>
    </PageTransition>
  );
}
