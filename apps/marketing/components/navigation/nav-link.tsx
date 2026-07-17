'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from '@/src/i18n/navigation';
import { cn } from '@/src/lib/utils';

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  isExternal?: boolean;
};

export function NavLink({ href, children, className, isExternal }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  const classes = cn(
    'relative inline-flex items-center text-sm font-semibold transition-colors',
    'after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:bg-cyan-400 after:transition-all after:duration-200',
    isActive
      ? 'text-cyan-400 after:w-full'
      : 'text-white/70 hover:text-white hover:after:w-full',
    className,
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
