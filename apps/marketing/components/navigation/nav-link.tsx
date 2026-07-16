'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from '@/src/i18n/navigation';
import { cn } from '@/src/lib/utils';

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'relative inline-flex items-center text-sm font-medium transition-colors',
        'after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:bg-cyan-500 after:transition-all after:duration-200 hover:after:w-full',
        isActive
          ? 'text-cyan-500 after:w-full'
          : 'text-foreground/70 hover:text-foreground',
        className,
      )}
    >
      {children}
    </Link>
  );
}
