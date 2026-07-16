'use client';

import { useEffect } from 'react';

/**
 * Privacy-focused analytics component.
 *
 * Loads a self-hosted analytics script (Plausible-compatible) from the
 * NEXT_PUBLIC_ANALYTICS_URL environment variable.
 *
 * - Script loads async, does not block rendering
 * - Fails silently if analytics server is unreachable
 * - No cookie consent banner needed (privacy-focused, no personal data)
 * - Tracks: page views, locale. Does NOT track: personal data, IP addresses
 *
 * Per UI-SPEC lines 841-847 (D-24) and CONTEXT.md D-24.
 */
export function Analytics() {
  useEffect(() => {
    const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;

    // No analytics configured — silent fail
    if (!analyticsUrl) {
      return;
    }

    // Check if script already loaded
    const existingScript = document.querySelector(
      `script[data-domain="oversighthub.com"]`,
    );
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = analyticsUrl;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-domain', 'oversighthub.com');
    script.setAttribute('data-api', `${analyticsUrl}/api/event`);

    // Cleanup on unmount
    script.onerror = () => {
      script.remove();
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // This component renders nothing visible
  return null;
}
