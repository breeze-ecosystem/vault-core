export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export const TURNSTILE_SCRIPT_ID = 'cf-turnstile-sdk';

declare const turnstile: {
  render: (
    container: string | HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
};

export function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(TURNSTILE_SCRIPT_ID)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Cloudflare Turnstile script'));

    document.head.appendChild(script);
  });
}
