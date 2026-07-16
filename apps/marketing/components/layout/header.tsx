'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/src/lib/utils';
import { Container } from './container';
import { NavLink } from '@/components/navigation/nav-link';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import { MobileMenu } from './mobile-menu';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-md shadow-sm'
          : 'bg-transparent',
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-cyan-500">◆</span>
            <span>Oversight AI</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop right section */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/contact"
              className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              Book a Demo
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-md transition-colors hover:bg-secondary"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <div className="flex flex-col gap-1.5">
              <span
                className={cn(
                  'block h-0.5 w-5 bg-foreground transition-all duration-250',
                  mobileOpen && 'translate-y-2 rotate-45',
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-5 bg-foreground transition-all duration-250',
                  mobileOpen && 'opacity-0',
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-5 bg-foreground transition-all duration-250',
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
