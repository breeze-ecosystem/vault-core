"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface ErrorScreenProps {
  errorCode?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onHome: () => void;
  locale: Locale;
}

export function ErrorScreen({
  errorCode,
  errorMessage,
  onRetry,
  onHome,
  locale,
}: ErrorScreenProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Determine context-specific message
  const getMessage = (): string => {
    switch (errorCode) {
      case "NETWORK":
      case "UNKNOWN":
        return t("error.server", locale);
      case "PRINTER_ERROR":
        return t("error.printerOffline", locale);
      case "UNAUTHORIZED":
        return t("error.unauthorized", locale);
      case "ALREADY_CHECKED_IN":
        return t("error.alreadyCheckedIn", locale);
      case "ALREADY_CHECKED_OUT":
        return t("checkout.alreadyDone", locale);
      case "VISIT_EXPIRED":
        return t("error.visitExpired", locale);
      default:
        return errorMessage || t("error.heading", locale);
    }
  };

  // Determine auto-reset behavior for non-fatal errors
  useEffect(() => {
    let timeout: number | undefined;
    switch (errorCode) {
      case "ALREADY_CHECKED_IN":
        setCountdown(5);
        timeout = window.setTimeout(() => onHome(), 5000);
        break;
      case "ALREADY_CHECKED_OUT":
        setCountdown(3);
        timeout = window.setTimeout(() => onHome(), 3000);
        break;
      case "VISIT_EXPIRED":
        setCountdown(8);
        timeout = window.setTimeout(() => onHome(), 8000);
        break;
      default:
        setCountdown(null);
        break;
    }
    return () => {
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, [errorCode, onHome]);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Flashing countdown display
  const showCountdown = countdown !== null && countdown > 0;

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in px-6">
      {/* Error icon */}
      <AlertTriangle className="h-16 w-16 text-red-500 mb-6" />

      {/* Heading */}
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
        {t("error.heading", locale)}
      </h1>

      {/* Context-specific message */}
      <p className="text-base text-gray-500 text-center max-w-sm mb-8">
        {getMessage()}
      </p>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {/* Retry button (only when onRetry provided) */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="h-14 w-full bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t("printing.retry", locale)}
          </button>
        )}

        {/* Home button (always visible) */}
        <button
          onClick={onHome}
          className="h-12 w-full bg-white border-2 border-gray-200 text-gray-900 rounded-full text-base font-medium hover:border-gray-300 transition-colors"
        >
          {t("error.home", locale)}
        </button>
      </div>

      {/* Auto-reset countdown (non-fatal errors only) */}
      {showCountdown && (
        <p className="text-sm text-gray-400 mt-6">
          {t("success.countdown", locale, { seconds: String(countdown) })}
        </p>
      )}
    </div>
  );
}
