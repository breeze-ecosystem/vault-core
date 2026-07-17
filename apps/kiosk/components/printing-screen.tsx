"use client";

import { useState, useEffect } from "react";
import { Printer, PrinterX } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

type PrintState = "connecting" | "generating" | "printing" | "complete";

interface PrintingScreenProps {
  onPrintComplete: () => void;
  onCancelCheckin: () => void;
  locale: Locale;
  error?: string | null;
  onRetry: () => void;
}

export function PrintingScreen({
  onPrintComplete,
  onCancelCheckin,
  locale,
  error,
  onRetry,
}: PrintingScreenProps) {
  const [printState, setPrintState] = useState<PrintState>("connecting");

  // Progress simulation: connecting → generating → printing → complete
  useEffect(() => {
    const t1 = setTimeout(() => setPrintState("generating"), 1500);
    const t2 = setTimeout(() => setPrintState("printing"), 3500);
    const t3 = setTimeout(() => setPrintState("complete"), 6500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // On "complete": call onPrintComplete after 1s delay
  useEffect(() => {
    if (printState === "complete") {
      const timer = setTimeout(() => onPrintComplete(), 1000);
      return () => clearTimeout(timer);
    }
  }, [printState, onPrintComplete]);

  // ── Error state (when parent passes error prop) ──
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="bg-red-50 border border-red-200 rounded-kiosk p-6 max-w-sm w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <PrinterX className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t("printing.error", locale)}
            </h3>
            <p className="text-base text-gray-600 mb-2">{error}</p>
            <p className="text-sm text-gray-500 mb-6">
              {t("printing.errorDetail", locale)}
            </p>
            <button
              onClick={onRetry}
              className="h-14 w-full bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-colors mb-3"
            >
              {t("printing.retry", locale)}
            </button>
            <button
              onClick={onCancelCheckin}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t("printing.cancelCheckin", locale)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Progress states ──

  const statusText = (): string => {
    switch (printState) {
      case "connecting":
        return t("printing.connecting", locale);
      case "generating":
        return t("printing.generating", locale);
      case "printing":
        return t("printing.status", locale);
      case "complete":
        return t("printing.done", locale);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in">
      <Printer
        className={`h-16 w-16 mb-6 ${
          printState === "complete"
            ? "text-emerald-600"
            : "text-blue-600 animate-pulse"
        }`}
      />
      <p
        className={`text-lg font-medium ${
          printState === "complete" ? "text-emerald-600" : "text-gray-900"
        }`}
      >
        {statusText()}
      </p>
      <div className="mt-8 h-1 w-64 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            printState === "complete"
              ? "w-full bg-emerald-500"
              : "w-2/3 bg-blue-600 animate-pulse"
          }`}
        />
      </div>
    </div>
  );
}
