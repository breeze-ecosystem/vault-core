"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface SlaStatusBadgeProps {
  incidentId: string;
  targetMinutes: number;
  createdAt: string;
}

export function SlaStatusBadge({ incidentId, targetMinutes, createdAt }: SlaStatusBadgeProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const created = new Date(createdAt).getTime();
    const update = () => setElapsed(Math.round((Date.now() - created) / 60000));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const ratio = targetMinutes > 0 ? elapsed / targetMinutes : 0;
  const remaining = Math.max(0, targetMinutes - elapsed);

  let variant: "default" | "secondary" | "destructive" = "default";
  let label = `⏱️ ${elapsed}/${targetMinutes} min`;

  if (ratio >= 1) {
    variant = "destructive";
    label = `⚠️ SLA dépassé (${elapsed}/${targetMinutes})`;
  } else if (ratio >= 0.5) {
    variant = "secondary";
    label = `⚠️ Bientôt dépassé (${elapsed}/${targetMinutes})`;
  } else {
    variant = "default";
    label = `Dans les temps (${remaining} min restantes)`;
  }

  return <Badge variant={variant}>{label}</Badge>;
}
