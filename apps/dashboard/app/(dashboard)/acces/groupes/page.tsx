'use client';

import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { AccessGroupList } from '@/components/access-group-list';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccessGroupesPage() {
  const router = useRouter();

  return (
    <PageTransition>
      <div className="space-y-6 max-w-3xl">
        <PageHeader
          title="Groupes d'accès"
          description="Créez et gérez les groupes d'accès par rôle (employé, manager, visiteur)"
          action={{
            label: 'Retour',
            icon: ArrowLeft,
            onClick: () => router.push('/acces'),
          }}
        />

        <AccessGroupList />
      </div>
    </PageTransition>
  );
}
