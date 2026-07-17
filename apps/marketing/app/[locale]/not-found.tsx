import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found - OVERSIGHT AI',
};

export default function LocaleNotFound() {
  return (
    <>
      <Header />
      <main>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
          <h1 className="text-display font-display mb-4 text-white">Page introuvable</h1>
          <p className="mb-8 text-lg text-[#94a3b8]">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link href="/">
            <Button variant="primary" size="lg">
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
