import { I18n } from "i18n-js";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import * as ExpoLocalization from "expo-localization";
import { fr } from "./locales/fr";
import { en } from "./locales/en";

export type Locale = "fr" | "en";
type Dictionary = typeof fr;

const i18n = new I18n({ fr, en });
i18n.enableFallback = true;
i18n.defaultLocale = "fr";

export interface I18nContextValue {
  t: (key: string, params?: Record<string, any>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    // Auto-detect device locale, fall back to French (D-06: French is source of truth)
    const locales = ExpoLocalization.getLocales();
    const deviceLocale = locales[0]?.languageCode;
    const detected: Locale = deviceLocale === "en" ? "en" : "fr";
    i18n.locale = detected;
    setLocaleState(detected);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    i18n.locale = newLocale;
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => {
      return i18n.t(key, params);
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return ctx;
}
