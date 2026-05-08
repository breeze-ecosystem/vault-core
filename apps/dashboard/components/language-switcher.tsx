"use client";

import { useTranslation, type Locale } from "@/lib/i18n/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const localeLabels: Record<Locale, { label: string; flag: string }> = {
  fr: { label: "Français", flag: "🇫🇷" },
  en: { label: "English", flag: "🇬🇧" },
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const current = localeLabels[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-sm">
          <span>{current.flag}</span>
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(localeLabels) as Locale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={loc === locale ? "bg-accent" : ""}
          >
            <span className="mr-2">{localeLabels[loc].flag}</span>
            {localeLabels[loc].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
