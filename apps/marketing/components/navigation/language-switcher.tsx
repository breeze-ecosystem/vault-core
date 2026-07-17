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
      className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
      aria-label="Select language"
    >
      {routing.locales.map((locale) => (
        <option key={locale} value={locale} className="bg-[#0c1020] text-white">
          {localeLabels[locale]?.flag ?? locale} {localeLabels[locale]?.label ?? locale.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
