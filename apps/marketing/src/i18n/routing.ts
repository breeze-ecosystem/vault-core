import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'ja', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
