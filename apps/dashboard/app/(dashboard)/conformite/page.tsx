"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceReportSelector } from "@/components/compliance/ComplianceReportSelector";
import { generateComplianceReport } from "@/lib/api";
import type { ComplianceReportType } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function ConformitePage() {
  const [generating, setGenerating] = useState(false);

  async function handleGenerate(reportType: ComplianceReportType, dateRange?: { from: string; to: string }) {
    setGenerating(true);
    try {
      await generateComplianceReport(reportType, dateRange);
    } catch (e: any) {
      toast(e.message || "Échec de la génération du rapport", "error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Conformité"
        description="Générez des rapports de conformité pour vos audits de sécurité"
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rapports de conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <ComplianceReportSelector onGenerate={handleGenerate} loading={generating} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">SOC</span>
              </div>
              <div>
                <p className="font-medium">SOC 2 Type II</p>
                <p className="text-sm text-muted-foreground">
                  Rapport de contrôle des systèmes et organisationnels
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">ISO</span>
              </div>
              <div>
                <p className="font-medium">ISO 27001</p>
                <p className="text-sm text-muted-foreground">
                  Rapport de management de la sécurité de l'information
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">AR</span>
              </div>
              <div>
                <p className="font-medium">Revue d'accès</p>
                <p className="text-sm text-muted-foreground">
                  Rapport de révision des droits d'accès utilisateurs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
