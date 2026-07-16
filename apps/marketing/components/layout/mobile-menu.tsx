'use client';

import Link from 'next/link';
import { cn } from '@/src/lib/utils';
import { NavLink } from '@/components/navigation/nav-link';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <div
      className={cn(
        'lg:hidden overflow-hidden transition-all duration-300 ease-out',
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
      )}
    >
      <div className="border-t border-border px-4 pb-6 pt-4">
        <nav className="flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-4">
          <LanguageSwitcher />
          <Link
            href="/contact"
            onClick={onClose}
            className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg px-5 py-2.5 text-center text-sm font-semibold transition-colors"
          >
            Book a Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
