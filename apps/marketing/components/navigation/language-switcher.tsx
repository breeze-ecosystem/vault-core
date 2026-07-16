'use client';

import { usePathname, useRouter } from '@/src/i18n/navigation';
import { useLocale } from 'next-intl';
import { routing } from '@/src/i18n/routing';

const localeLabels: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  fr: { label: 'Français', flag: '🇫🇷' },
  es: { label: 'Español', flag: '🇪🇸' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ar: { label: 'العربية', flag: '🇸🇦' },
};

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();
  const current = localeLabels[currentLocale] ?? localeLabels.en;

  const handleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
      className="cursor-pointer rounded-md border border-border bg-transparent px-2 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label="Select language"
    >
      {routing.locales.map((locale) => (
        <option key={locale} value={locale}>
          {localeLabels[locale]?.flag ?? locale} {localeLabels[locale]?.label ?? locale.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
