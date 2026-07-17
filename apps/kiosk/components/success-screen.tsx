"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Bell, LogOut, QrCode } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface SuccessScreenProps {
  visitorName: string;
  hostName: string;
  visitDate: string;
  onHome: () => void;
  locale: Locale;
}

export function SuccessScreen({
  visitorName,
  hostName,
  visitDate,
  onHome,
  locale,
}: SuccessScreenProps) {
  const [countdown, setCountdown] = useState(8);

  // 8s auto-reset countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onHome]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in px-6">
      {/* Success icon */}
      <CheckCircle className="h-20 w-20 text-emerald-500 animate-scale-in mb-6" />

      {/* Welcome heading */}
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
        {t("success.heading", locale, { name: visitorName })}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t("success.subtitle", locale)}
      </p>

      {/* Badge preview card */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-kiosk p-6 w-72 h-44 flex flex-col items-center justify-center mb-6">
        <QrCode className="h-10 w-10 text-gray-400 mb-2" />
        <p className="font-bold text-gray-900 text-base">
          {visitorName}
        </p>
        <p className="text-sm text-gray-500">{hostName}</p>
        <p className="text-xs text-gray-400 mt-1">{visitDate}</p>
      </div>

      {/* Host notification */}
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-4 w-4 text-gray-400" />
        <p className="text-sm text-gray-500">
          {t("success.hostNotified", locale)}
        </p>
      </div>

      {/* Check-out hint */}
      <div className="flex items-center gap-2 mb-8">
        <LogOut className="h-4 w-4 text-gray-400" />
        <p className="text-sm text-gray-400">
          {t("success.checkoutHint", locale)}
        </p>
      </div>

      {/* Auto-reset countdown */}
      <p className="text-sm text-gray-400 mb-6">
        {t("success.countdown", locale, { seconds: String(countdown) })}
      </p>

      {/* Home button */}
      <button
        onClick={onHome}
        className="h-12 px-8 bg-white border-2 border-gray-200 text-gray-900 rounded-full text-base font-medium hover:border-gray-300 transition-colors"
      >
        {t("success.home", locale)}
      </button>
    </div>
  );
}
