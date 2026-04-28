"use client";

import { PageHeader } from "@/components/page-header";
import { Settings } from "lucide-react";

export default function ParametresPage() {
  return (
    <div>
      <PageHeader
        title="Parametres"
        description="Configuration du systeme"
      />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <div className="rounded-full bg-muted p-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Parametres</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Les parametres seront disponibles prochainement
        </p>
      </div>
    </div>
  );
}
