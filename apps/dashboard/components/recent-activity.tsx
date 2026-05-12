import { Badge } from "@/components/ui/badge";
import { type Alert } from "@/lib/api";

const severityVariant: Record<string, "destructive" | "warning" | "default" | "secondary" | "success"> = {
  CRITICAL: "destructive",
  HIGH: "warning",
  MEDIUM: "default",
  LOW: "secondary",
  INFO: "secondary",
};

interface RecentActivityProps {
  alerts: Alert[];
}

export function RecentActivity({ alerts }: RecentActivityProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">Aucune activite recente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between rounded-lg border border-border p-3"
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{alert.title}</p>
            <p className="text-xs text-muted-foreground">
              {alert.camera?.name ?? "Caméra inconnue"} —{" "}
              {new Date(alert.createdAt).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge variant={severityVariant[alert.severity] ?? "secondary"}>
            {alert.severity}
          </Badge>
        </div>
      ))}
    </div>
  );
}
