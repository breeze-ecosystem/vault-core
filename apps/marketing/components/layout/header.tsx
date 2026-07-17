'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/src/lib/utils';
import { Container } from './container';
import { NavLink } from '@/components/navigation/nav-link';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import { MobileMenu } from './mobile-menu';
import { buttonVariants } from '@/components/ui/button';

const NAV_ITEMS = [
  { key: 'produits', href: '/produits' },
  { key: 'solutions', href: '/solutions' },
  { key: 'etudesDeCas', href: '/etudes-de-cas' },
  { key: 'demo', href: '/demo' },
  { key: 'blog', href: '/blog' },
  { key: 'tarifs', href: '/pricing' },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations('nav');
  const ctaT = useTranslations('cta');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const prefixedLinks = NAV_ITEMS.map((item) => ({
    key: item.key,
    label: t(item.key),
    href: `/${locale}${item.href}`,
  }));

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-black/60 backdrop-blur-2xl border-b border-white/5'
          : 'bg-transparent',
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 font-display font-semibold text-white"
          >
            <span className="text-cyan-400">&#9670;</span>
            <span>Oversight AI</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {prefixedLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop right section */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href={`/${locale}/contact`}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              {ctaT('bookDemo')}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-md transition-colors hover:bg-white/5"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <div className="flex flex-col gap-1.5">
              <span
                className={cn(
                  'block h-0.5 w-5 bg-white transition-all duration-250',
                  mobileOpen && 'translate-y-2 rotate-45',
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-5 bg-white transition-all duration-250',
                  mobileOpen && 'opacity-0',
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-5 bg-white transition-all duration-250',
                  mobileOpen && '-translate-y-2 -rotate-45',
                )}
              />
            </div>
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
