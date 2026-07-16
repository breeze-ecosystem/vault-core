'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

type ErrorMessageProps = {
  message: string;
  onDismiss?: () => void;
};

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!onDismiss) return;

    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border-l-4 border-red-500 bg-red-500/10 p-4"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-300">Something went wrong</p>
        <p className="mt-1 text-sm text-red-200/80">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          className="flex-shrink-0 text-red-300 hover:text-red-200 transition-colors"
          aria-label="Dismiss error"
        >
          &times;
        </button>
      )}
    </div>
  );
}
