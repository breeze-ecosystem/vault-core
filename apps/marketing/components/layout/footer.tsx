import Link from 'next/link';
import { Container } from './container';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '/' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <Container>
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
          <p className="text-sm text-muted">
            &copy; 2026 Oversight AI. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
