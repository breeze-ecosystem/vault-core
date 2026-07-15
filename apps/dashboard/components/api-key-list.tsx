"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, Trash2 } from "lucide-react";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
}

interface ApiKeyListProps {
  keys: ApiKeyRecord[];
  onRevoke: (id: string) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ApiKeyList({ keys, onRevoke }: ApiKeyListProps) {
  if (keys.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Key className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Aucune clé API configurée</p>
        <p className="mt-1 text-xs">
          Créez une clé pour utiliser l'API REST de génération de licences.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Nom</th>
            <th className="px-4 py-3 text-left font-medium">Clé</th>
            <th className="px-4 py-3 text-left font-medium">Statut</th>
            <th className="px-4 py-3 text-left font-medium">Créée le</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">{key.name}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">
                  ••••••{key.keyPrefix}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant={key.isActive ? "default" : "secondary"}>
                  {key.isActive ? "Active" : "Révoquée"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDate(key.createdAt)}
              </td>
              <td className="px-4 py-3">
                {key.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Révoquer la clé ${key.name} ? Cette action est irréversible.`)) {
                        onRevoke(key.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Révoquer
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
