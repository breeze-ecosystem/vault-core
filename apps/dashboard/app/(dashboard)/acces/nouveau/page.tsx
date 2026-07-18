'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { GlassCard } from '@/components/glass-card';
import { CredentialForm, type CredentialFormData } from '@/components/credential-form';
import { createCredentialV2 } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { ArrowLeft } from 'lucide-react';

export default function NouveauCredentialPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: CredentialFormData) => {
    setSubmitting(true);
    try {
      // Build the API payload
      const payload: Record<string, any> = {
        type: data.type,
      };

      // For PIN, we send the hash (in production this would be hashed server-side)
      if (data.type === 'PIN' && data.pinValue) {
        payload.pinHash = data.pinValue; // Will be hashed by API
      }

      if (data.type === 'BADGE' && data.badgeNumber) {
        payload.badgeNumber = data.badgeNumber;
      }

      if (data.type === 'QR' && data.qrSeed) {
        payload.qrSeed = data.qrSeed;
      }

      if (data.type === 'FINGERPRINT' && data.fingerprintTemplateHash) {
        payload.fingerprintTemplateHash = data.fingerprintTemplateHash;
      }

      if (data.validFrom) payload.validFrom = new Date(data.validFrom).toISOString();
      if (data.validUntil) payload.validUntil = new Date(data.validUntil).toISOString();
      if (data.maxUses) payload.maxUses = data.maxUses;

      await createCredentialV2(payload as any);
      toast('Justificatif créé', 'success');
      router.push('/acces');
    } catch (e: any) {
      const detail = e.message || '';
      toast(
        `Échec de création du justificatif. ${detail} Vérifiez les informations et réessayez.`,
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="Nouveau justificatif"
          description="Créez un badge, une empreinte, un QR code ou un code PIN"
          action={{
            label: 'Retour',
            icon: ArrowLeft,
            onClick: () => router.push('/acces'),
          }}
        />

        <GlassCard variant="default" className="p-6">
          <CredentialForm onSubmit={handleSubmit} submitting={submitting} />
        </GlassCard>
      </div>
    </PageTransition>
  );
}
