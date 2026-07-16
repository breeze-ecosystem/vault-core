import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#06b6d4',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    template: '%s | Oversight AI',
    default: 'Oversight AI — AI-Powered Physical Security Intelligence',
  },
  description:
    'AI-powered physical security platform unifying video surveillance, access control, and operational intelligence for security teams worldwide.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Oversight AI',
    url: 'https://oversighthub.com',
    logo: 'https://oversighthub.com/icon-512.png',
    description:
      'AI-powered physical security intelligence platform unifying video surveillance, access control, and operational security.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'contact@oversighthub.com',
    },
  };

  return (
    <>
      {children}
      <Script
        id="organization-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
    </>
  );
}
