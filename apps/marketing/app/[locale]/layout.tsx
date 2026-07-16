import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/src/i18n/routing';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/src/lib/seo';

const rtlLocales = new Set(['ar']);

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const direction = rtlLocales.has(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <OrganizationJsonLd />
          <WebSiteJsonLd />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
