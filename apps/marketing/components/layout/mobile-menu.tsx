'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'motion/react';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import { buttonVariants } from '@/components/ui/button';

const NAV_ITEMS = [
  { key: 'produits', href: '/produits' },
  { key: 'solutions', href: '/solutions' },
  { key: 'etudesDeCas', href: '/etudes-de-cas' },
  { key: 'demo', href: '/demo' },
  { key: 'blog', href: '/blog' },
  { key: 'tarifs', href: '/pricing' },
  { key: 'contact', href: '/contact' },
] as const;

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const ctaT = useTranslations('cta');

  const navItems = NAV_ITEMS.map((item) => ({
    key: item.key,
    label: t(item.key),
    href: `/${locale}${item.href}`,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-3xl lg:hidden"
        >
          {/* Nav links with staggered entrance */}
          <nav className="flex flex-col gap-6 p-8 pt-24">
            {navItems.map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="text-2xl font-display text-white transition-colors hover:text-cyan-400"
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Bottom section: CTA + LanguageSwitcher */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-6 px-8">
            <Link
              href={`/${locale}/contact`}
              onClick={onClose}
              className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full' })}
            >
              {ctaT('bookDemo')}
            </Link>
            <LanguageSwitcher />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
