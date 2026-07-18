'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreditCard, Fingerprint, QrCode, KeyRound } from 'lucide-react';

type CredentialType = 'BADGE' | 'FINGERPRINT' | 'QR' | 'PIN';

interface CredentialTypeSelectorProps {
  value: CredentialType;
  onChange: (type: CredentialType) => void;
}

const credentialTypes: Array<{
  id: CredentialType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    id: 'BADGE',
    label: 'Badge RFID',
    description: 'Badge physique avec puce RFID',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-cyan-500',
  },
  {
    id: 'FINGERPRINT',
    label: 'Empreinte',
    description: 'Empreinte digitale scannée au lecteur',
    icon: <Fingerprint className="h-4 w-4" />,
    color: 'text-pink-500',
  },
  {
    id: 'QR',
    label: 'QR Code',
    description: 'Code QR généré ou saisi manuellement',
    icon: <QrCode className="h-4 w-4" />,
    color: 'text-amber-500',
  },
  {
    id: 'PIN',
    label: 'PIN',
    description: 'Code numérique personnel',
    icon: <KeyRound className="h-4 w-4" />,
    color: 'text-purple-500',
  },
];

export function CredentialTypeSelector({
  value,
  onChange,
}: CredentialTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Type de justificatif</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {credentialTypes.map((type) => {
          const isActive = value === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200',
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border/50 hover:border-primary/30 hover:bg-muted/10',
              )}
            >
              <div className={cn('h-8 w-8 flex items-center justify-center', type.color)}>
                {type.icon}
              </div>
              <div>
                <p className="text-sm font-medium">{type.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{type.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
