'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  loadTurnstileScript,
  TURNSTILE_SITE_KEY,
} from '@/src/lib/turnstile';

type TurnstileWidgetProps = {
  onToken: (token: string) => void;
  onError?: () => void;
};

export type TurnstileWidgetHandle = {
  reset: () => void;
};

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(({ onToken, onError }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current) {
        const { turnstile: ts } = window as unknown as {
          turnstile?: {
            reset: (id: string) => void;
            render: (
              el: string | HTMLElement,
              opts: Record<string, unknown>,
            ) => string;
          };
        };
        ts?.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    async function initTurnstile() {
      try {
        await loadTurnstileScript();
      } catch {
        onError?.();
        return;
      }

      if (cancelled || !containerRef.current) return;

      // Poll for turnstile global
      const waitForTurnstile = (retries = 30): Promise<void> => {
        return new Promise((resolve) => {
          const check = (attempt: number) => {
            if ((window as unknown as { turnstile?: unknown }).turnstile) {
              resolve();
            } else if (attempt < retries) {
              setTimeout(() => check(attempt + 1), 200);
            } else {
              onError?.();
              resolve();
            }
          };
          check(0);
        });
      };

      await waitForTurnstile();

      if (cancelled || !containerRef.current) return;

      const ts = (window as unknown as { turnstile: { render: (el: string | HTMLElement, opts: Record<string, unknown>) => string } }).turnstile;

      widgetIdRef.current = ts.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => {
          onError?.();
          onToken('');
        },
      });
    }

    initTurnstile();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      id="turnstile-container"
      className="turnstile-widget"
    />
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';
