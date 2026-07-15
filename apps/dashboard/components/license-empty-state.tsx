import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LicenseEmptyStateProps {
  isAdmin?: boolean;
  onCreateClick?: () => void;
}

export function LicenseEmptyState({ isAdmin, onCreateClick }: LicenseEmptyStateProps) {
  if (isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Key className="mx-auto mb-3 h-12 w-12 opacity-30" />
        <p className="text-base font-medium">Aucune licence créée</p>
        <p className="mt-1 text-sm">
          Créez votre première licence pour un client. La licence sera générée sous forme de clé JWT à transmettre au client.
        </p>
        {onCreateClick && (
          <Button className="mt-4" onClick={onCreateClick}>
            Créer une licence
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-muted-foreground">
      <Key className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p className="text-base font-medium">Aucune licence active</p>
      <p className="mt-1 text-sm">
        Votre licence n&apos;est pas encore activée. Collez la clé JWT fournie par votre administrateur ci-dessous pour activer votre licence.
      </p>
    </div>
  );
}
