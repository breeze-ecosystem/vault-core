"use client";

import { useState } from "react";
import { User, Loader2 } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface VisitorInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  photoUrl?: string;
}

interface VisitInfo {
  id: string;
  visitorId: string;
  hostUserId: string;
  hostName?: string;
  purpose?: string;
  validFrom: string;
  validUntil: string;
  status: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  visitor?: VisitorInfo;
}

interface ConfirmCheckinProps {
  visit: VisitInfo;
  onConfirm: () => void;
  onCancel: () => void;
  locale: Locale;
}

type ConfirmState = "ready" | "confirming" | "error";

export default function ConfirmCheckin({
  visit,
  onConfirm,
  onCancel,
  locale,
}: ConfirmCheckinProps) {
  const [state, setState] = useState<ConfirmState>("ready");
  const [errorMessage, setErrorMessage] = useState("");

  const visitor = visit.visitor;
  const visitorName = visitor
    ? `${visitor.firstName} ${visitor.lastName}`
    : "—";
  const company = visitor?.company || "—";

  const formatTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return t("confirm.today", locale, { time: `${hours}:${minutes}` });
  };

  const handleConfirm = async () => {
    setState("confirming");
    setErrorMessage("");
    try {
      await onConfirm();
    } catch (err: any) {
      setState("error");
      setErrorMessage(err.message || t("error.server", locale));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white animate-fade-in transition-all duration-200">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 pt-8 pb-4">
        {/* Screen Heading */}
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
          {t("confirm.heading", locale)}
        </h2>

        {/* Visitor Photo */}
        <div className="mb-4">
          {visitor?.photoUrl ? (
            <img
              src={visitor.photoUrl}
              alt={visitorName}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          )}
        </div>

        {/* Visitor Name */}
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          {visitorName}
        </h1>

        {/* Company */}
        <p className="text-base text-gray-500 mt-1 text-center">{company}</p>

        {/* Details Card */}
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-kiosk p-6 mt-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-base text-gray-500">
              {t("confirm.hostLabel", locale)}
            </span>
            <span className="text-base text-gray-900 font-medium text-right">
              {visit.hostName || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-base text-gray-500">
              {t("confirm.companyLabel", locale)}
            </span>
            <span className="text-base text-gray-900 font-medium text-right">
              {company}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-base text-gray-500">
              {t("confirm.dateLabel", locale)}
            </span>
            <span className="text-base text-gray-900 font-medium text-right">
              {formatTime()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-base text-gray-500">
              {t("confirm.purposeLabel", locale)}
            </span>
            <span className="text-base text-gray-900 font-medium text-right">
              {visit.purpose || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-4 pb-6 flex flex-col items-center gap-3">
        {/* Error Card */}
        {state === "error" && errorMessage && (
          <div className="w-full max-w-sm p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 text-center">{errorMessage}</p>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={state === "confirming"}
          className="h-14 w-full max-w-sm bg-blue-600 text-white rounded-full flex items-center justify-center gap-2 text-lg font-medium hover:bg-blue-700 active:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          {state === "confirming" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("confirm.loading", locale)}
            </>
          ) : (
            t("confirm.button", locale)
          )}
        </button>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          disabled={state === "confirming"}
          className="h-12 w-full max-w-sm bg-white border-2 border-gray-200 text-gray-900 rounded-full flex items-center justify-center text-base font-medium hover:border-gray-300 disabled:opacity-40 transition-all duration-200"
        >
          {t("common.cancel", locale)}
        </button>
      </div>
    </div>
  );
}
