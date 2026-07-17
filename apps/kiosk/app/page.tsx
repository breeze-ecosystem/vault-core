"use client";

import { useState, useReducer, useEffect, useCallback } from "react";
import WelcomeScreen from "@/components/welcome-screen";
import QRScanner from "@/components/qr-scanner";
import SearchScreen from "@/components/search-screen";
import ConfirmCheckin from "@/components/confirm-checkin";
import { PrintingScreen } from "@/components/printing-screen";
import { SuccessScreen } from "@/components/success-screen";
import { CheckoutScreen } from "@/components/checkout-screen";
import { ErrorScreen } from "@/components/error-screen";
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
  const [errorCode, setErrorCode] = useState<string | undefined>();
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

    // Store visitor data from already-loaded selectedVisit
    if (selectedVisit?.visitor) {
      setVisitorNameForSuccess(
        `${selectedVisit.visitor.firstName} ${selectedVisit.visitor.lastName}`,
      );
    }

    // Go to printing screen immediately
    dispatch({ type: "CONFIRM" });

    try {
      await checkIn(selectedVisitId);

      // Attempt print after check-in succeeds
      try {
        await printBadge(selectedVisitId);
        dispatch({ type: "PRINT_COMPLETE" });
      } catch (printErr: any) {
        const msg =
          printErr.message || t("printing.errorDetail", locale);
        setErrorCode("PRINTER_ERROR");
        setErrorMessage(msg);
        dispatch({ type: "PRINT_ERROR", error: msg });
      }
    } catch (err: any) {
      let code = "UNKNOWN";
      let msg = err.message || t("error.server", locale);
      if (err instanceof KioskApiError) {
        code = err.code;
      }
      setErrorCode(code);
      setErrorMessage(msg);
      dispatch({ type: "PRINT_ERROR", error: msg });
    }
  }, [selectedVisitId, selectedVisit, locale]);

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
        let code = "UNKNOWN";
        let msg = err.message || t("error.server", locale);
        if (err instanceof KioskApiError) {
          code = err.code;
        }
        setErrorCode(code);
        setErrorMessage(msg);
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
    setErrorCode(undefined);
    setErrorMessage("");
    setVisitorNameForSuccess("");
  }, []);

  const handlePrintRetry = useCallback(async () => {
    if (!selectedVisitId) return;
    dispatch({ type: "CONFIRM" });
    try {
      await printBadge(selectedVisitId);
      dispatch({ type: "PRINT_COMPLETE" });
    } catch (err: any) {
      const msg = err.message || t("printing.errorDetail", locale);
      setErrorCode("PRINTER_ERROR");
      setErrorMessage(msg);
      dispatch({ type: "PRINT_ERROR", error: msg });
    }
  }, [selectedVisitId, locale]);

  const handlePrintComplete = useCallback(() => {
    dispatch({ type: "PRINT_COMPLETE" });
  }, []);

  const handleCancelCheckin = useCallback(() => {
    dispatch({ type: "CANCEL" });
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
          <PrintingScreen
            onPrintComplete={handlePrintComplete}
            onCancelCheckin={handleCancelCheckin}
            locale={locale}
            error={errorMessage || null}
            onRetry={handlePrintRetry}
          />
        );

      case "success":
        return (
          <SuccessScreen
            visitorName={visitorNameForSuccess}
            hostName={selectedVisit?.hostName || ""}
            visitDate={new Date().toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            onHome={handleHome}
            locale={locale}
          />
        );

      case "checkout-success":
        return (
          <CheckoutScreen
            visitorName={visitorNameForSuccess}
            onHome={handleHome}
            locale={locale}
          />
        );

      case "error":
        return (
          <ErrorScreen
            errorCode={errorCode}
            errorMessage={errorMessage || t("error.server", locale)}
            onRetry={
              errorCode === "PRINTER_ERROR" || (errorMessage && !errorCode)
                ? handlePrintRetry
                : undefined
            }
            onHome={handleHome}
            locale={locale}
          />
        );

      default:
        return null;
    }
  }

  return renderPhase();
}
