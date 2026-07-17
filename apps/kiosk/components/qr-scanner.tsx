"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CameraOff } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface QRScannerProps {
  onQRDecoded: (visitId: string) => void;
  onCancel: () => void;
  onManualEntry: () => void;
  locale: Locale;
}

type ScannerState = "initializing" | "scanning" | "no-camera" | "permission-denied";

export default function QRScanner({
  onQRDecoded,
  onCancel,
  onManualEntry,
  locale,
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const [state, setState] = useState<ScannerState>("initializing");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function initScanner() {
      if (!videoRef.current) return;

      try {
        // Dynamic import instascan (it's a browser-only library)
        const Instascan = (await import("instascan")).default;

        if (!mounted) return;

        const scanner = new Instascan.Scanner({
          video: videoRef.current,
          mirror: true,
          captureImage: false,
          backgroundScan: true,
          refractoryPeriod: 5000,
          scanPeriod: 1,
        });

        scanner.addListener("scan", (content: string) => {
          if (mounted) {
            onQRDecoded(content);
          }
        });

        scannerRef.current = scanner;

        const cameras = await Instascan.Camera.getCameras();

        if (!mounted) return;

        if (cameras.length > 0) {
          // Prefer back camera
          const backCamera: any =
            cameras.find((c: any) =>
              c.name.toLowerCase().includes("back"),
            ) || cameras[0];

          await scanner.start(backCamera);
          if (mounted) setState("scanning");
        } else {
          setState("no-camera");
        }
      } catch (err: any) {
        if (!mounted) return;

        // Check for permission error
        if (
          err.name === "NotAllowedError" ||
          err.message?.includes("permission") ||
          err.message?.includes("Permission")
        ) {
          setState("permission-denied");
        } else if (
          err.name === "NotFoundError" ||
          err.message?.includes("camera") ||
          err.message?.includes("Camera")
        ) {
          setState("no-camera");
        } else {
          setState("no-camera");
          setErrorMsg(err.message || "");
        }
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex flex-col bg-gray-50 animate-fade-in transition-all duration-200">
      {/* Top Bar */}
      <div className="flex items-center px-4 pt-4 pb-2">
        <button
          onClick={onCancel}
          className="h-12 flex items-center gap-2 text-gray-700 text-base font-medium hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t("common.cancel", locale)}
        </button>
      </div>

      {/* Camera Viewfinder Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {state === "initializing" || state === "scanning" ? (
          <>
            <div className="relative w-full max-w-lg">
              <video
                ref={videoRef}
                className={`w-full h-72 rounded-xl bg-black object-cover ${
                  state === "scanning"
                    ? "border-2 border-dashed border-white/50"
                    : ""
                }`}
                playsInline
                muted
                autoPlay
              />
              {state === "scanning" && (
                <div className="absolute inset-0 rounded-xl border-2 border-dashed border-blue-500 animate-pulse pointer-events-none" />
              )}
            </div>

            <p className="text-base text-gray-500 mt-4 text-center">
              {t("scanner.instruction", locale)}
            </p>
          </>
        ) : state === "no-camera" ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <CameraOff className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-base text-gray-700 font-medium text-center">
              {t("scanner.noCamera", locale)}
            </p>
            {errorMsg && (
              <p className="text-sm text-gray-500 text-center">{errorMsg}</p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-6 bg-blue-600 text-white rounded-full text-base font-medium hover:bg-blue-700 transition-colors"
            >
              {t("printing.retry", locale)}
            </button>
          </div>
        ) : state === "permission-denied" ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <CameraOff className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-base text-gray-700 font-medium text-center">
              {t("scanner.permissionDenied", locale)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-6 bg-blue-600 text-white rounded-full text-base font-medium hover:bg-blue-700 transition-colors"
            >
              {t("printing.retry", locale)}
            </button>
          </div>
        ) : null}

        {/* Manual Entry Link */}
        <button
          onClick={onManualEntry}
          className="mt-4 text-sm text-blue-600 underline cursor-pointer hover:text-blue-700 transition-colors"
        >
          {t("scanner.manualLink", locale)}
        </button>
      </div>
    </div>
  );
}
