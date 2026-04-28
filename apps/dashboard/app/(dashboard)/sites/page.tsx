"use client";

import { PageHeader } from "@/components/page-header";
import { MapPin } from "lucide-react";

export default function SitesPage() {
  return (
    <div>
      <PageHeader
        title="Sites"
        description="Administration des sites surveilles"
      />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <div className="rounded-full bg-muted p-4">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Sites</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          La gestion des sites sera disponible prochainement
        </p>
      </div>
    </div>
  );
}
