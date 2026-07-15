import { Badge } from "@/components/ui/badge";

type LicenseState = 'trial' | 'active' | 'grace' | 'expired' | 'no_license';

const statusConfig: Record<LicenseState, { variant: "default" | "secondary" | "destructive" | "warning" | "success"; label: string; className?: string }> = {
  active: { variant: "default", label: "Active" },
  trial: { variant: "warning", label: "Essai" },
  grace: { variant: "warning", label: "Période de grâce", className: "animate-pulse" },
  expired: { variant: "destructive", label: "Expirée" },
  no_license: { variant: "secondary", label: "Aucune licence" },
};

export function LicenseStatusBadge({ state }: { state: LicenseState }) {
  const config = statusConfig[state] || { variant: "secondary" as const, label: state };
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
