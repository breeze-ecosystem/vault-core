export const severityColors: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  INFO: "#6b7280",
};

export const statusColors: Record<string, string> = {
  ONLINE: "#22c55e",
  OFFLINE: "#dc2626",
  MAINTENANCE: "#f97316",
  DEGRADED: "#eab308",
};

export const statusLabels: Record<string, string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
  MAINTENANCE: "Maintenance",
  DEGRADED: "Dégradé",
};

export const alertStatusColors: Record<string, string> = {
  OPEN: "#f97316",
  ACKNOWLEDGED: "#3b82f6",
  RESOLVED: "#22c55e",
  FALSE_POSITIVE: "#6b7280",
};

export const alertStatusLabels: Record<string, string> = {
  OPEN: "Ouverte",
  ACKNOWLEDGED: "Prise en compte",
  RESOLVED: "Résolue",
  FALSE_POSITIVE: "Faux positif",
};

export const siteStatusColor = (isActive: boolean): string =>
  isActive ? "#22c55e" : "#6b7280";
