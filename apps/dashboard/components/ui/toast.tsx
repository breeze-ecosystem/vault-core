"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;
let addToastFn: ((message: string, type: Toast["type"]) => void) | null = null;

export function toast(message: string, type: Toast["type"] = "info") {
  addToastFn?.(message, type);
}

toast.success = (message: string) => toast(message, "success");
toast.error = (message: string) => toast(message, "error");

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  addToastFn = addToast;

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
            t.type === "success"
              ? "bg-green-600 text-white"
              : t.type === "error"
              ? "bg-destructive text-white"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
