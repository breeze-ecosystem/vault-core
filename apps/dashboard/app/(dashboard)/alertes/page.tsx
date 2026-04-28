"use client";

import { PageHeader } from "@/components/page-header";
import { AlertTriangle } from "lucide-react";

export default function AlertesPage() {
  return (
    <div>
      <PageHeader
        title="Alertes"
        description="Consultation et gestion des alertes du systeme"
      />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <div className="rounded-full bg-muted p-4">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Alertes</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          La gestion des alertes sera disponible prochainement
        </p>
      </div>
    </div>
  );
}
