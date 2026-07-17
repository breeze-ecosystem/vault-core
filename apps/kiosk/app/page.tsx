"use client";

import { useState, useReducer, useEffect, useCallback } from "react";
import WelcomeScreen from "@/components/welcome-screen";
import QRScanner from "@/components/qr-scanner";
import SearchScreen from "@/components/search-screen";
import ConfirmCheckin from "@/components/confirm-checkin";
import { t, type Locale } from "@/lib/i18n";
import {
  checkIn,
  checkOut,
  printBadge,
  getVisit,
  KioskApiError,
} from "@/lib/kiosk-api";

// ─── Type Definitions ───

type KioskPhase =
  | "welcome"
  | "scanning"
  | "search"
  | "confirm"
  | "printing"
  | "success"
  | "checkout-success"
  | "error";

type KioskAction =
  | { type: "SCAN_QR" }
  | { type: "SEARCH_NAME" }
  | { type: "QR_DECODED"; visitId: string }
  | { type: "VISIT_SELECTED"; visitId: string }
  | { type: "CONFIRM" }
  | { type: "PRINT_COMPLETE" }
  | { type: "PRINT_ERROR"; error: string }
  | { type: "CANCEL" }
  | { type: "HOME" }
  | { type: "TIMEOUT" }
  | { type: "CHECKOUT_SUCCESS"; visitorName: string };

// ─── Visit Type (inline to avoid dependency issues) ───

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

// ─── State Machine Reducer ───

function kioskReducer(state: KioskPhase, action: KioskAction): KioskPhase {
  switch (state) {
    case "welcome":
      switch (action.type) {
        case "SCAN_QR":
          return "scanning";
        case "SEARCH_NAME":
          return "search";
        default:
          return state;
      }

    case "scanning":
      switch (action.type) {
        case "QR_DECODED":
          return "confirm";
        case "CANCEL":
        case "TIMEOUT":
          return "welcome";
        default:
          return state;
      }

    case "search":
      switch (action.type) {
        case "VISIT_SELECTED":
          return "confirm";
        case "CANCEL":
        case "TIMEOUT":
          return "welcome";
        default:
          return state;
      }

    case "confirm":
      switch (action.type) {
        case "CONFIRM":
          return "printing";
        case "CANCEL":
        case "TIMEOUT":
          return "welcome";
        default:
          return state;
      }

    case "printing":
      switch (action.type) {
        case "PRINT_COMPLETE":
          return "success";
        case "PRINT_ERROR":
          return "error";
        case "CANCEL":
          return "welcome";
        default:
          return state;
      }

    case "success":
      switch (action.type) {
        case "HOME":
        case "TIMEOUT":
          return "welcome";
        default:
          return state;
      }

    case "checkout-success":
      switch (action.type) {
        case "HOME":
        case "TIMEOUT":
          return "welcome";
        default:
          return state;
      }

    case "error":
      switch (action.type) {
        case "CONFIRM":
          return "printing";
        case "HOME":
          return "welcome";
        default:
          return state;
      }

    default:
      return state;
  }
}

// ─── Main Page Component ───

export default function Home() {
  const [phase, dispatch] = useReducer(kioskReducer, "welcome");
  const [locale, setLocale] = useState<Locale>("fr");
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [visitorNameForSuccess, setVisitorNameForSuccess] = useState("");

  // ─── Language Toggle ───

  const handleToggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "fr" ? "en" : "fr"));
  }, []);

  // ─── Navigation Handlers ───

  const handleScanClick = useCallback(() => {
    dispatch({ type: "SCAN_QR" });
  }, []);

  const handleSearchClick = useCallback(() => {
    dispatch({ type: "SEARCH_NAME" });
  }, []);

  const handleQRDecoded = useCallback(
    async (content: string) => {
      // content is the QR-encoded visit ID or URL
      // Try to extract visit ID (could be raw UUID or URL containing it)
      const visitId = content.includes("/")
        ? content.split("/").pop() || content
        : content;

      setSelectedVisitId(visitId);

      try {
        // Try to fetch visit details to determine if check-in or check-out
        const visit = await getVisit(visitId);
        setSelectedVisit(visit);

        if (visit.status === "scheduled") {
          dispatch({ type: "QR_DECODED", visitId });
        } else if (
          visit.status === "checked-in" ||
          visit.status === "active"
        ) {
          // Badge QR scan → check-out flow
          await handleCheckout(visitId, visit);
        } else {
          // Unknown status → go to welcome
          dispatch({ type: "CANCEL" });
        }
      } catch {
        // If visit not found or error, still try to transition to confirm
        dispatch({ type: "QR_DECODED", visitId });
      }
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSelectVisit = useCallback(
    async (visitId: string) => {
      setSelectedVisitId(visitId);
      try {
        const visit = await getVisit(visitId);
        setSelectedVisit(visit);
        dispatch({ type: "VISIT_SELECTED", visitId });
      } catch {
        // If fetch fails, still try to proceed
        dispatch({ type: "VISIT_SELECTED", visitId });
      }
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedVisitId) return;

    try {
      await checkIn(selectedVisitId);
      dispatch({ type: "CONFIRM" });

      // Attempt print after check-in succeeds
      try {
        await printBadge(selectedVisitId);
        dispatch({ type: "PRINT_COMPLETE" });
      } catch (printErr: any) {
        dispatch({
          type: "PRINT_ERROR",
          error: printErr.message || t("error.server", locale),
        });
      }
    } catch (err: any) {
      throw err;
    }
  }, [selectedVisitId, locale]);

  const handleCheckout = useCallback(
    async (visitId: string, visit?: VisitInfo) => {
      try {
        await checkOut(visitId);
        const name = visit?.visitor
          ? `${visit.visitor.firstName} ${visit.visitor.lastName}`
          : "";
        setVisitorNameForSuccess(name);
        dispatch({ type: "CHECKOUT_SUCCESS", visitorName: name });
      } catch (err: any) {
        setErrorMessage(err.message || t("error.server", locale));
        dispatch({ type: "CANCEL" });
      }
    },
    [locale],
  );

  const handleCancel = useCallback(() => {
    dispatch({ type: "CANCEL" });
  }, []);

  const handleHome = useCallback(() => {
    dispatch({ type: "HOME" });
    setSelectedVisitId(null);
    setSelectedVisit(null);
    setErrorMessage("");
    setVisitorNameForSuccess("");
  }, []);

  const handlePrintRetry = useCallback(() => {
    dispatch({ type: "CONFIRM" });
  }, []);

  // ─── Idle Timer ───
  // Welcome: 60s, mid-flow: 30s, success: 8s auto-advance, checkout-success: 5s, error: no timeout

  useEffect(() => {
    // Error phase: no auto-timeout (user must tap)
    if (phase === "error") return;

    // Success: 8s auto-advance via setTimeout → HOME
    if (phase === "success") {
      const timer = setTimeout(() => handleHome(), 8000);
      return () => clearTimeout(timer);
    }

    // Checkout success: 5s auto-advance
    if (phase === "checkout-success") {
      const timer = setTimeout(() => handleHome(), 5000);
      return () => clearTimeout(timer);
    }

    // Welcome: 60s, all other phases: 30s
    const timeoutMs = phase === "welcome" ? 60000 : 30000;
    const timer = setTimeout(() => dispatch({ type: "TIMEOUT" }), timeoutMs);

    return () => clearTimeout(timer);
  }, [phase, handleHome]);

  // ─── Render Phase ───

  function renderPhase() {
    switch (phase) {
      case "welcome":
        return (
          <WelcomeScreen
            onScanClick={handleScanClick}
            onSearchClick={handleSearchClick}
            locale={locale}
            onToggleLocale={handleToggleLocale}
          />
        );

      case "scanning":
        return (
          <QRScanner
            onQRDecoded={handleQRDecoded}
            onCancel={handleCancel}
            onManualEntry={handleSearchClick}
            locale={locale}
          />
        );

      case "search":
        return (
          <SearchScreen
            onSelectVisit={handleSelectVisit}
            onCancel={handleCancel}
            locale={locale}
          />
        );

      case "confirm":
        return selectedVisit ? (
          <ConfirmCheckin
            visit={selectedVisit}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            locale={locale}
          />
        ) : (
          <div className="h-screen flex items-center justify-center bg-white">
            <p className="text-lg text-gray-500">
              {t("confirm.loading", locale)}
            </p>
          </div>
        );

      case "printing":
        return (
          <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6" />
            <p className="text-lg text-gray-700 font-medium">
              {t("printing.status", locale)}
            </p>
          </div>
        );

      case "success":
        return (
          <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              {t("success.heading", locale, {
                name: visitorNameForSuccess || "",
              })}
            </h2>
            <p className="text-lg text-gray-500 mt-2">
              {t("success.subtitle", locale)}
            </p>
            <p className="text-sm text-gray-400 mt-8">
              {t("success.countdown", locale, { seconds: "8" })}
            </p>
            <button
              onClick={handleHome}
              className="mt-4 h-12 px-8 bg-blue-600 text-white rounded-full text-base font-medium hover:bg-blue-700 transition-colors"
            >
              {t("success.home", locale)}
            </button>
          </div>
        );

      case "checkout-success":
        return (
          <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              {t("checkout.success", locale, {
                name: visitorNameForSuccess || "",
              })}
            </h2>
            <p className="text-sm text-gray-400 mt-8">
              {t("success.countdown", locale, { seconds: "5" })}
            </p>
            <button
              onClick={handleHome}
              className="mt-4 h-12 px-8 bg-blue-600 text-white rounded-full text-base font-medium hover:bg-blue-700 transition-colors"
            >
              {t("success.home", locale)}
            </button>
          </div>
        );

      case "error":
        return (
          <div className="h-screen flex flex-col items-center justify-center bg-white animate-fade-in px-4">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
              {t("error.heading", locale)}
            </h2>
            <p className="text-base text-gray-500 text-center max-w-sm mb-8">
              {errorMessage || t("error.server", locale)}
            </p>
            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
              <button
                onClick={handlePrintRetry}
                className="h-14 w-full bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {t("printing.retry", locale)}
              </button>
              <button
                onClick={handleHome}
                className="h-12 w-full bg-white border-2 border-gray-200 text-gray-900 rounded-full text-base font-medium hover:border-gray-300 transition-colors"
              >
                {t("error.home", locale)}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return renderPhase();
}
