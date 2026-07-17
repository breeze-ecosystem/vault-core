"use client";

import { useState, useEffect } from "react";
import { LogOut, CheckCircle2 } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface CheckoutScreenProps {
  visitorName: string;
  onHome: () => void;
  locale: Locale;
}

export function CheckoutScreen({
  visitorName,
  onHome,
  locale,
}: CheckoutScreenProps) {
  const [phase, setPhase] = useState<"processing" | "success">("processing");
  const [countdown, setCountdown] = useState(5);

  // Processing → success after 2s
  useEffect(() => {
    const timer = setTimeout(() => setPhase("success"), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 5s countdown after success, then auto-reset
  useEffect(() => {
    if (phase !== "success") return;
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
    return () => {
      clearInterval(interval);
    };
  }, [phase, onHome]);

  if (phase === "processing") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in">
        <LogOut className="h-16 w-16 text-blue-600 animate-pulse mb-4" />
        <p className="text-lg text-gray-700 font-medium">
          {t("checkout.processing", locale)}
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in">
      <CheckCircle2 className="h-20 w-20 text-emerald-500 animate-scale-in mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
        {t("checkout.success", locale, { name: visitorName })}
      </h1>
      <p className="text-sm text-gray-400 mt-8">
        {t("success.countdown", locale, { seconds: String(countdown) })}
      </p>
    </div>
  );
}
