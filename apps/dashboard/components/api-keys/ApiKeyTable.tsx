"use client";

import { type ApiKey } from "@/lib/api";

interface ApiKeyTableProps {
  keys: ApiKey[];
  onRevoke: (id: string) => void;
}

export function ApiKeyTable({ keys, onRevoke }: ApiKeyTableProps) {
  if (keys.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">Aucune clé API configurée.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium">Préfixe</th>
            <th className="pb-2 font-medium">Statut</th>
            <th className="pb-2 font-medium">Limite</th>
            <th className="pb-2 font-medium">Dernière utilisation</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id} className="border-b last:border-0">
              <td className="py-3">{key.name}</td>
              <td className="py-3 font-mono text-xs">{key.keyPrefix}...</td>
              <td className="py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  key.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                }`}>
                  {key.isActive ? "Active" : "Révoquée"}
                </span>
              </td>
              <td className="py-3">{key.rateLimit}/min</td>
              <td className="py-3 text-muted-foreground">
                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Jamais"}
              </td>
              <td className="py-3">
                {key.isActive && (
                  <button
                    onClick={() => onRevoke(key.id)}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Révoquer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
