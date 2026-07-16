"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { toast } from "@/components/ui/toast";
import { createCredential, revokeCredential, reissueCredential, type CredentialDto } from "@/lib/api";

interface CredentialLifecycleFormProps {
  credential?: CredentialDto | null;
  orgId: string;
  onDone: () => void;
}

export function CredentialLifecycleForm({ credential, orgId, onDone }: CredentialLifecycleFormProps) {
  const [type, setType] = useState(credential?.type || "BADGE");
  const [badgeNumber, setBadgeNumber] = useState(credential?.badgeNumber || "");
  const [validUntil, setValidUntil] = useState(credential?.validUntil?.split("T")[0] || "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!credential;

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createCredential({
        userId: "",
        type,
        badgeNumber: badgeNumber || undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      });
      toast("Justificatif créé avec succès", "success");
      onDone();
    } catch {
      toast("Échec de la création", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!credential || !reason.trim()) return;
    setSaving(true);
    try {
      await revokeCredential(credential.id, reason);
      toast("Justificatif révoqué", "success");
      onDone();
    } catch {
      toast("Échec de la révocation", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReissue = async () => {
    if (!credential || !validUntil) return;
    setSaving(true);
    try {
      await reissueCredential(credential.id, new Date(validUntil).toISOString());
      toast("Justificatif réémis", "success");
      onDone();
    } catch {
      toast("Échec de la réémission", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold mb-4">
        {isEditing ? "Gestion du justificatif" : "Nouvel identifiant"}
      </h3>

      <div className="space-y-3">
        {!isEditing && (
          <>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "BADGE" | "PIN" | "MOBILE" | "QR")}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="BADGE">Badge</option>
                <option value="PIN">Code PIN</option>
                <option value="MOBILE">Mobile</option>
                <option value="QR">QR Code</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Identifiant</label>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                placeholder="N° de badge"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Valide jusqu'au</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {isEditing && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Motif de révocation</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              placeholder="Raison requise pour révoquer"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {!isEditing ? (
            <Button onClick={handleCreate} disabled={saving} className="flex-1">
              {saving ? "Création..." : "Créer"}
            </Button>
          ) : (
            <>
              <Button onClick={handleRevoke} disabled={saving || !reason.trim()} variant="destructive" className="flex-1">
                {saving ? "Révocation..." : "Révoquer"}
              </Button>
              <Button onClick={handleReissue} disabled={saving || !validUntil} variant="secondary" className="flex-1">
                {saving ? "Réémission..." : "Réémettre"}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onDone}>
            Annuler
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
