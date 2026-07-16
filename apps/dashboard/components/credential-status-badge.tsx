"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CredentialStatusBadgeProps {
  isActive: boolean;
  validUntil?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

export function CredentialStatusBadge({
  isActive,
  validUntil,
  revokedAt,
  revokedReason,
}: CredentialStatusBadgeProps) {
  if (revokedAt) {
    const badge = (
      <Badge variant="outline" className="text-muted-foreground line-through">
        ⚫ Révoqué
      </Badge>
    );
    if (revokedReason) {
      return (
        <Tooltip>
          <TooltipTrigger>{badge}</TooltipTrigger>
          <TooltipContent>{revokedReason}</TooltipContent>
        </Tooltip>
      );
    }
    return badge;
  }

  if (!isActive) {
    return <Badge variant="outline">⚫ Inactif</Badge>;
  }

  if (validUntil) {
    const expiryDate = new Date(validUntil);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);

    if (expiryDate < now) {
      return <Badge variant="destructive">🔴 Expiré</Badge>;
    }
    if (daysUntilExpiry <= 7) {
      return <Badge variant="secondary">🟡 Expire dans {daysUntilExpiry} jour(s)</Badge>;
    }
  }

  return <Badge variant="default">🟢 Actif</Badge>;
}
