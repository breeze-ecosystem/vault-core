"use client";

import { useAuth } from "@/lib/auth-context";
import { hasMinRole } from "@repo/shared";
import { PageHeader } from "@/components/page-header";
import { Users, ShieldX } from "lucide-react";

export default function UtilisateursPage() {
  const { user } = useAuth();

  if (!user || !hasMinRole(user.role as any, "ADMIN")) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Acces refuse</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous n&apos;avez pas les permissions necessaires pour acceder a cette page
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Gestion des comptes utilisateurs"
      />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <div className="rounded-full bg-muted p-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Utilisateurs</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          La gestion des utilisateurs sera disponible prochainement
        </p>
      </div>
    </div>
  );
}
