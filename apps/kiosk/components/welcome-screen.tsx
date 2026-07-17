"use client";

import { Camera, Search } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface WelcomeScreenProps {
  onScanClick: () => void;
  onSearchClick: () => void;
  locale: Locale;
  onToggleLocale: () => void;
}

export default function WelcomeScreen({
  onScanClick,
  onSearchClick,
  locale,
  onToggleLocale,
}: WelcomeScreenProps) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in transition-all duration-200 px-4">
      {/* Language Toggle — Top Right */}
      <div className="absolute top-6 right-6 flex items-center gap-1">
        <button
          onClick={onToggleLocale}
          className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-base font-medium transition-colors ${
            locale === "fr"
              ? "text-blue-600 font-bold underline underline-offset-4"
              : "text-gray-500"
          }`}
          aria-pressed={locale === "fr"}
        >
          FR
        </button>
        <button
          onClick={onToggleLocale}
          className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-base font-medium transition-colors ${
            locale === "en"
              ? "text-blue-600 font-bold underline underline-offset-4"
              : "text-gray-500"
          }`}
          aria-pressed={locale === "en"}
        >
          EN
        </button>
      </div>

      {/* Brand */}
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        OVERSIGHT AI
      </h1>

      {/* Welcome Heading */}
      <h2 className="text-3xl font-bold text-gray-900 mt-8 text-center">
        {t("welcome.heading", locale)}
      </h2>

      {/* Subtitle */}
      <p className="text-lg text-gray-500 mt-3 text-center max-w-sm">
        {t("welcome.subtitle", locale)}
      </p>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-4 mt-12 w-full max-w-sm">
        {/* Primary CTA — Scan QR */}
        <button
          onClick={onScanClick}
          className="h-14 w-full bg-blue-600 text-white rounded-full flex items-center justify-center gap-2 text-lg font-medium hover:bg-blue-700 active:bg-blue-700 transition-all duration-200 active:scale-[0.98]"
        >
          <Camera className="w-5 h-5" />
          {t("welcome.scan", locale)}
        </button>

        {/* Secondary CTA — Search */}
        <button
          onClick={onSearchClick}
          className="h-14 w-full bg-white border-2 border-gray-200 text-gray-900 rounded-full flex items-center justify-center gap-2 text-lg font-medium hover:border-gray-300 active:border-gray-300 transition-all duration-200 active:scale-[0.98]"
        >
          <Search className="w-5 h-5" />
          {t("welcome.search", locale)}
        </button>
      </div>

      {/* Footer */}
      <p className="text-sm text-gray-400 mt-auto pb-8">
        {t("footer.text", locale)}
      </p>
    </div>
  );
}
