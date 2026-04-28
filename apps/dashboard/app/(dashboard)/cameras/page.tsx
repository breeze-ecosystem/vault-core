"use client";

import { PageHeader } from "@/components/page-header";
import { Video } from "lucide-react";

export default function CamerasPage() {
  return (
    <div>
      <PageHeader
        title="Cameras"
        description="Gestion des cameras du systeme de surveillance"
      />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <div className="rounded-full bg-muted p-4">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Cameras</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          La gestion des cameras sera disponible prochainement
        </p>
      </div>
    </div>
  );
}
