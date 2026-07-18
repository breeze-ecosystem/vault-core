"use client";

import { SubjectAccessPortal } from "@/components/subject-access-portal";
import { Shield } from "lucide-react";

export default function SubjectAccessPortalPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Portail d&apos;accès aux données personnelles
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accédez à vos données, signalez une erreur ou demandez leur
          suppression
        </p>
      </div>

      {/* Portal Component */}
      <SubjectAccessPortal />

      {/* Footer */}
      <p className="mt-8 text-[10px] text-muted-foreground">
        Conformément à la réglementation HAPDP (Niger) — vos données sont
        protégées
      </p>
    </div>
  );
}
