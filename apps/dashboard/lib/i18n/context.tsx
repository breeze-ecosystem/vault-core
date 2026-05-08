"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { fr } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import type { Dictionary } from "./dictionaries";

export type Locale = "fr" | "en";

const STORAGE_KEY = "oversight-locale";

const dictionaries: Record<Locale, Dictionary> = { fr, en };

function detectLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const lang = navigator.language?.toLowerCase() ?? "";
  return lang.startsWith("fr") ? "fr" : "en";
}

interface I18nContextValue {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, newLocale);
    setLocaleState(newLocale);
  }, []);

  const dictionary = dictionaries[locale];

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = dictionary;
      for (const k of keys) {
        if (result && typeof result === "object" && k in result) {
          result = result[k];
        } else {
          return key; // fallback: return key itself
        }
      }
      return typeof result === "string" ? result : key;
    },
    [dictionary],
  );

  // Prevent hydration mismatch — render children only after mounting
  if (!mounted) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, dictionary }}>
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
