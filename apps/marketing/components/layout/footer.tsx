import Link from 'next/link';
import { Container } from './container';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';

const footerColumns = [
  {
    title: 'Produit',
    links: [
      { label: 'Vue d\'ensemble', href: '/produits' },
      { label: 'Vidéo', href: '/produits/video' },
      { label: 'Contrôle d\'accès', href: '/produits/access-control' },
      { label: 'IA', href: '/produits/ai-analytics' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Documentation', href: '#' },
      { label: 'API', href: '#' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Tarifs', href: '/pricing' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'Confidentialité', href: '#' },
      { label: 'Conditions', href: '#' },
      { label: 'Cookies', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#070912] border-t border-white/5 pt-16 pb-8">
      <Container>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-white mb-4 font-display">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-cyan-400"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-cyan-400"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Glass divider */}
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
          <p className="text-sm text-muted">
            &copy; 2026 Oversight AI. Tous droits réservés.
          </p>
        </div>
      </Container>
    </footer>
  );
}
