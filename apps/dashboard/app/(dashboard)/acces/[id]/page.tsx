'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { AccessEventTimeline } from '@/components/access-event-timeline';
import {
  fetchCredential,
  deactivateCredential,
  type CredentialDto,
} from '@/lib/api';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  Trash2,
  Clock,
  User,
  Fingerprint,
  QrCode,
  KeyRound,
  CreditCard,
  Shield,
  Calendar,
  Smartphone,
} from 'lucide-react';

const typeLabels: Record<string, string> = {
  BADGE: 'Badge RFID',
  PIN: 'PIN',
  MOBILE: 'Mobile Wallet',
  QR: 'QR Code',
  FINGERPRINT: 'Empreinte',
  FACE: 'Visage',
};

const typeIcons: Record<string, React.ReactNode> = {
  BADGE: <CreditCard className="h-4 w-4" />,
  PIN: <KeyRound className="h-4 w-4" />,
  QR: <QrCode className="h-4 w-4" />,
  FINGERPRINT: <Fingerprint className="h-4 w-4" />,
  FACE: <Shield className="h-4 w-4" />,
  MOBILE: <Smartphone className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  BADGE: 'text-cyan-500 bg-cyan-500/10',
  PIN: 'text-purple-500 bg-purple-500/10',
  MOBILE: 'text-green-500 bg-green-500/10',
  QR: 'text-amber-500 bg-amber-500/10',
  FINGERPRINT: 'text-pink-500 bg-pink-500/10',
  FACE: 'text-blue-500 bg-blue-500/10',
};

export default function CredentialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const credentialId = params?.id as string;

  const [credential, setCredential] = useState<CredentialDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadCredential = useCallback(async () => {
    if (!credentialId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCredential(credentialId);
      setCredential(data);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement du justificatif");
    } finally {
      setLoading(false);
    }
  }, [credentialId]);

  useEffect(() => {
    loadCredential();
  }, [loadCredential]);

  // Loading state
  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Skeleton className="h-40 rounded-xl" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (error || !credential) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-lg font-medium">Erreur de chargement du justificatif</p>
            <p className="mt-1 text-sm text-muted-foreground">{error || 'Justificatif introuvable'}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" onClick={loadCredential}>
                Réessayer
              </Button>
              <Button variant="outline" onClick={() => router.push('/acces')}>
                Retour
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Détail du justificatif"
          description={`${credential.user?.firstName || ''} ${credential.user?.lastName || ''}`}
          action={{
            label: 'Retour',
            icon: ArrowLeft,
            onClick: () => router.push('/acces'),
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Credential type card */}
            <GlassCard variant="default" className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center mb-3 ${typeColors[credential.type] || 'bg-muted/30'}`}>
                  {typeIcons[credential.type] || <Shield className="h-6 w-6" />}
                </div>
                <Badge
                  variant={credential.isActive ? 'success' : 'secondary'}
                  className="mb-2"
                >
                  {credential.isActive ? 'Actif' : 'Inactif'}
                </Badge>
                <p className="text-sm font-medium">{typeLabels[credential.type] || credential.type}</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {credential.badgeNumber ||
                    (credential.pinHash ? credential.pinHash.substring(0, 8) + '...' : null) ||
                    (credential.qrSeed ? credential.qrSeed.substring(0, 8) + '...' : null) ||
                    '-'}
                </p>
              </div>
            </GlassCard>

            {/* Stats card */}
            <GlassCard variant="default" className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Utilisations</span>
                  <span className="font-mono text-sm tabular-nums">
                    {credential.useCount}{credential.maxUses ? `/${credential.maxUses}` : ''}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Créé le</span>
                  <span className="text-xs">
                    {new Date(credential.createdAt).toLocaleDateString('fr')}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Actions */}
            <GlassCard variant="default" className="p-4 space-y-3">
              {credential.isActive && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-amber-600 border-amber-600/30 hover:bg-amber-600/10"
                  onClick={() => setShowDeactivateConfirm(true)}
                >
                  <Ban className="h-4 w-4" />
                  Désactiver
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </GlassCard>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Owner info */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Informations du propriétaire
              </h3>
              {credential.user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Nom</span>
                    <span className="text-sm">{credential.user.firstName} {credential.user.lastName}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="text-sm">{credential.user.email}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucun utilisateur associé</p>
              )}
            </GlassCard>

            {/* Validity */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Période de validité
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Début</span>
                  <span className="text-sm font-medium">
                    {credential.validFrom
                      ? new Date(credential.validFrom).toLocaleDateString('fr', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Immédiat'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Fin</span>
                  <span className="text-sm font-medium">
                    {credential.validUntil
                      ? new Date(credential.validUntil).toLocaleDateString('fr', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Illimité'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Correlated access events */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Événements d'accès corrélés
              </h3>
              <AccessEventTimeline credentialId={credential.id} />
            </GlassCard>

            {/* Delete zone */}
            <GlassCard variant="default" className="p-6 border-destructive/20">
              <h3 className="text-sm font-semibold text-destructive mb-2">Zone dangereuse</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Cette action est irréversible. Le badge/code sera définitivement supprimé du système.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer le justificatif
              </Button>
            </GlassCard>
          </div>
        </div>

        {/* Deactivate confirmation */}
        <ConfirmationDialog
          isOpen={showDeactivateConfirm}
          title="Désactiver le justificatif"
          description={`${credential.badgeNumber || credential.type} ne sera plus valide. L'utilisateur perdra l'accès aux portes associées.`}
          confirmLabel="Désactiver"
          onConfirm={async () => {
            try {
              await deactivateCredential(credential.id);
              toast('Justificatif désactivé', 'success');
              setShowDeactivateConfirm(false);
              loadCredential();
            } catch (e: any) {
              toast(e.message || 'Échec de la désactivation', 'error');
            }
          }}
          onCancel={() => setShowDeactivateConfirm(false)}
        />

        {/* Delete confirmation */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          title="Supprimer le justificatif"
          description="Cette action est irréversible. Le badge/code sera définitivement supprimé du système."
          confirmLabel="Supprimer"
          onConfirm={async () => {
            try {
              await deactivateCredential(credential.id);
              toast('Justificatif supprimé', 'success');
              router.push('/acces');
            } catch (e: any) {
              toast(e.message || 'Échec de la suppression', 'error');
            }
          }}
          onCancel={() => setShowDeleteDialog(false)}
        />
      </div>
    </PageTransition>
  );
}
