'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GlassCard } from '@/components/glass-card';
import { CredentialTypeSelector } from '@/components/credential-type-selector';
import { Loader2, Scan, QrCode, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type CredentialType = 'BADGE' | 'FINGERPRINT' | 'QR' | 'PIN';

interface CredentialFormProps {
  onSubmit: (data: CredentialFormData) => Promise<void>;
  submitting?: boolean;
}

export interface CredentialFormData {
  type: CredentialType;
  badgeNumber?: string;
  qrSeed?: string;
  pinValue?: string;
  pinConfirm?: string;
  fingerprintTemplateHash?: string;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
}

export function CredentialForm({ onSubmit, submitting = false }: CredentialFormProps) {
  const [credType, setCredType] = useState<CredentialType>('BADGE');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [qrSeed, setQrSeed] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [fingerprintStatus, setFingerprintStatus] = useState<'idle' | 'scanning' | 'scanned'>('idle');
  const [fingerprintHash, setFingerprintHash] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (credType) {
      case 'BADGE':
        if (!badgeNumber.trim()) newErrors.badgeNumber = 'Le numéro de badge est requis';
        break;
      case 'FINGERPRINT':
        if (fingerprintStatus !== 'scanned') newErrors.fingerprint = "L'empreinte doit être scannée";
        break;
      case 'QR':
        if (!qrSeed.trim()) newErrors.qrSeed = 'Le code QR est requis';
        break;
      case 'PIN':
        if (!pinValue.trim()) newErrors.pinValue = 'Le code PIN est requis';
        if (pinValue !== pinConfirm) newErrors.pinConfirm = 'Les codes PIN ne correspondent pas';
        if (pinValue.length < 4 || pinValue.length > 8) newErrors.pinValue = 'Le PIN doit contenir 4 à 8 chiffres';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      type: credType,
      badgeNumber: credType === 'BADGE' ? badgeNumber.trim() : undefined,
      qrSeed: credType === 'QR' ? qrSeed.trim() : undefined,
      pinValue: credType === 'PIN' ? pinValue : undefined,
      pinConfirm: credType === 'PIN' ? pinConfirm : undefined,
      fingerprintTemplateHash: credType === 'FINGERPRINT' ? fingerprintHash : undefined,
      validFrom: validFrom || undefined,
      validUntil: validUntil || undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
    });
  };

  const handleGenerateQr = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setQrSeed(code);
  };

  const handleScanFingerprint = () => {
    setFingerprintStatus('scanning');
    // Simulate scan — in production this would call the reader API
    setTimeout(() => {
      const mockHash = 'fp_' + Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');
      setFingerprintHash(mockHash);
      setFingerprintStatus('scanned');
      setErrors((prev) => ({ ...prev, fingerprint: '' }));
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Credential type selector */}
      <CredentialTypeSelector value={credType} onChange={setCredType} />

      {/* BADGE fields */}
      {credType === 'BADGE' && (
        <div className="space-y-3">
          <Label htmlFor="badge-number" className="text-sm font-medium">
            Numéro de badge
          </Label>
          <Input
            id="badge-number"
            value={badgeNumber}
            onChange={(e) => {
              setBadgeNumber(e.target.value);
              setErrors((prev) => ({ ...prev, badgeNumber: '' }));
            }}
            placeholder="Ex: RF-42A7"
            className={errors.badgeNumber ? 'border-destructive' : ''}
          />
          {errors.badgeNumber && (
            <p className="text-xs text-destructive">{errors.badgeNumber}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Saisissez le numéro imprimé sur le badge ou scannez-le avec un lecteur RFID
          </p>
        </div>
      )}

      {/* FINGERPRINT fields */}
      {credType === 'FINGERPRINT' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Scan d&apos;empreinte</Label>

          {fingerprintStatus === 'idle' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleScanFingerprint}
                className="gap-2 h-auto py-4 px-6"
              >
                <Scan className="h-5 w-5" />
                Scanner l&apos;empreinte
              </Button>
              <p className="text-xs text-muted-foreground">
                Placez le doigt sur le lecteur connecté
              </p>
            </div>
          )}

          {fingerprintStatus === 'scanning' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <p className="text-sm font-medium">Scan en cours...</p>
              <p className="text-xs text-muted-foreground">Maintenez le doigt sur le lecteur</p>
            </div>
          )}

          {fingerprintStatus === 'scanned' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm font-medium text-success">Empreinte scannée</p>
              <code className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                {fingerprintHash.substring(0, 24)}...
              </code>
            </div>
          )}

          {errors.fingerprint && (
            <p className="text-xs text-destructive">{errors.fingerprint}</p>
          )}
        </div>
      )}

      {/* QR fields */}
      {credType === 'QR' && (
        <div className="space-y-3">
          <Label htmlFor="qr-seed" className="text-sm font-medium">
            Code QR
          </Label>
          <div className="flex gap-2">
            <Input
              id="qr-seed"
              value={qrSeed}
              onChange={(e) => {
                setQrSeed(e.target.value);
                setErrors((prev) => ({ ...prev, qrSeed: '' }));
              }}
              placeholder="Code QR"
              className={errors.qrSeed ? 'border-destructive' : ''}
            />
            <Button type="button" variant="outline" onClick={handleGenerateQr} className="gap-2 shrink-0">
              <QrCode className="h-4 w-4" />
              Générer
            </Button>
          </div>
          {errors.qrSeed && (
            <p className="text-xs text-destructive">{errors.qrSeed}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Générez un code aléatoire ou saisissez un code existant
          </p>
        </div>
      )}

      {/* PIN fields */}
      {credType === 'PIN' && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="pin-value" className="text-sm font-medium">
              Code PIN
            </Label>
            <Input
              id="pin-value"
              type="password"
              value={pinValue}
              onChange={(e) => {
                setPinValue(e.target.value);
                setErrors((prev) => ({ ...prev, pinValue: '' }));
              }}
              placeholder="4 à 8 chiffres"
              maxLength={8}
              inputMode="numeric"
              className={errors.pinValue ? 'border-destructive' : ''}
            />
            {errors.pinValue && (
              <p className="text-xs text-destructive">{errors.pinValue}</p>
            )}
          </div>
          <div>
            <Label htmlFor="pin-confirm" className="text-sm font-medium">
              Confirmer le PIN
            </Label>
            <Input
              id="pin-confirm"
              type="password"
              value={pinConfirm}
              onChange={(e) => {
                setPinConfirm(e.target.value);
                setErrors((prev) => ({ ...prev, pinConfirm: '' }));
              }}
              placeholder="Répétez le code PIN"
              maxLength={8}
              inputMode="numeric"
              className={errors.pinConfirm ? 'border-destructive' : ''}
            />
            {errors.pinConfirm && (
              <p className="text-xs text-destructive">{errors.pinConfirm}</p>
            )}
          </div>
        </div>
      )}

      {/* Common fields — expiry */}
      <div className="space-y-3 pt-4 border-t border-border">
        <p className="text-sm font-medium">Période de validité</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="valid-from" className="text-xs text-muted-foreground">
              Début
            </Label>
            <Input
              id="valid-from"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="valid-until" className="text-xs text-muted-foreground">
              Fin
            </Label>
            <Input
              id="valid-until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="max-uses" className="text-xs text-muted-foreground">
            Utilisations max (optionnel)
          </Label>
          <Input
            id="max-uses"
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Illimité"
            className="mt-1 max-w-[200px]"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg" disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Création en cours...' : 'Créer le justificatif'}
        </Button>
        <Button type="reset" variant="outline" size="lg">
          Réinitialiser
        </Button>
      </div>
    </form>
  );
}
