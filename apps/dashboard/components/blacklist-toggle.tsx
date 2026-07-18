'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Loader2 } from 'lucide-react';

interface BlacklistToggleProps {
  faceId: string;
  isBlacklisted: boolean;
  faceName: string;
  onToggle: () => Promise<void>;
  disabled?: boolean;
}

export function BlacklistToggle({
  faceId,
  isBlacklisted,
  faceName,
  onToggle,
  disabled = false,
}: BlacklistToggleProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleChange = () => {
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onToggle();
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Switch
          checked={isBlacklisted}
          onCheckedChange={handleToggleChange}
          disabled={disabled || loading}
          aria-label={isBlacklisted ? 'Retirer de la liste noire' : 'Ajouter à la liste noire'}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {isBlacklisted ? 'Liste noire' : 'Ajouter à la liste noire'}
          </span>
          <span className="text-xs text-muted-foreground">
            {isBlacklisted
              ? 'Ce visage déclenche une alerte CRITIQUE en cas de détection'
              : 'Les détections futures déclencheront une alerte CRITIQUE'}
          </span>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <ConfirmationDialog
        isOpen={showConfirm}
        title={isBlacklisted ? 'Retirer de la liste noire' : 'Ajouter à la liste noire'}
        description={
          isBlacklisted
            ? `Retirer ${faceName} de la liste noire ? Les détections futures ne déclencheront plus d'alerte CRITIQUE.`
            : `Ajouter ${faceName} à la liste noire ? Cette action déclenchera une alerte CRITIQUE en cas de détection.`
        }
        confirmLabel={isBlacklisted ? 'Retirer' : 'Ajouter'}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        isLoading={loading}
      />
    </>
  );
}
