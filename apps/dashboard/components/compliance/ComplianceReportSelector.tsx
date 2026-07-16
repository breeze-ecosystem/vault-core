"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type ComplianceReportType } from "@/lib/api";

interface ComplianceReportSelectorProps {
  onGenerate: (reportType: ComplianceReportType, dateRange?: { from: string; to: string }) => void;
  loading: boolean;
}

export function ComplianceReportSelector({ onGenerate, loading }: ComplianceReportSelectorProps) {
  const [reportType, setReportType] = useState<ComplianceReportType>("soc2");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const reportTypes: { value: ComplianceReportType; label: string; description: string }[] = [
    {
      value: "soc2",
      label: "SOC 2 Type II",
      description: "Rapport de contrôle des systèmes et organisationnels",
    },
    {
      value: "iso27001",
      label: "ISO 27001",
      description: "Rapport de management de la sécurité de l'information",
    },
    {
      value: "access-review",
      label: "Revue d'accès",
      description: "Rapport de révision des droits d'accès utilisateurs",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {reportTypes.map((rt) => (
          <label
            key={rt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
              reportType === rt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <input
              type="radio"
              name="reportType"
              value={rt.value}
              checked={reportType === rt.value}
              onChange={() => setReportType(rt.value)}
              className="mt-1"
            />
            <div>
              <p className="font-medium">{rt.label}</p>
              <p className="text-sm text-muted-foreground">{rt.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Du</label>
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={dateRange.from}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Au</label>
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={dateRange.to}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            const range = dateRange.from && dateRange.to
              ? { from: new Date(dateRange.from).toISOString(), to: new Date(dateRange.to).toISOString() }
              : undefined;
            onGenerate(reportType, range);
          }}
          disabled={loading}
        >
          {loading ? "Génération..." : "Générer le rapport"}
        </Button>
      </div>
    </div>
  );
}
