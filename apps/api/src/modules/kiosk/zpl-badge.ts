/**
 * ZPL badge template for 4" × 2" thermal labels at 203 DPI.
 *
 * Generates ZPL (Zebra Programming Language) strings for visitor badges
 * containing: visitor name, host name, date/time, and QR code.
 *
 * Using hand-rolled template function — the format is simple enough
 * that a dependency like node-zpl is unnecessary overhead.
 */

interface BadgeData {
  visitorName: string;
  hostName: string;
  date: string;       // e.g., "17/07/2026 14:30"
  qrContent: string;  // The QR code content (visit ID or URL)
}

/**
 * Generate a complete ZPL label string for a visitor badge.
 *
 * Badge dimensions: 4" × 2" (812 × 406 dots at 203 DPI)
 * Layout:
 *   - Header: "Visit.me by OVERSIGHT AI" (top)
 *   - Visitor name (large, centered)
 *   - Host: {name}
 *   - Date/time
 *   - QR code (right side, ~120×120 dots)
 *   - Separator line
 *   - Footer: "Visit.me by OVERSIGHT AI"
 */
export function generateZplBadge(data: BadgeData): string {
  const { visitorName, hostName, date, qrContent } = data;

  return `^XA
^FO50,50^A0N,40,40^FDVisit.me by OVERSIGHT AI^FS
^FO50,120^A0N,60,60^FD${escapeZpl(visitorName)}^FS
^FO50,200^A0N,30,30^FDHost: ${escapeZpl(hostName)}^FS
^FO50,260^A0N,30,30^FD${escapeZpl(date)}^FS
^FO350,120^BQN,2,8^FDQA,${qrContent}^FS
^FO50,320^GB500,1,3^FS
^FO50,350^A0N,20,20^FDVisit.me by OVERSIGHT AI^FS
^XZ`;
}

/**
 * Escape ZPL control characters from text fields.
 *
 * ^ and ~ are ZPL control character prefixes — they must be removed
 * from text fields to prevent accidental command injection.
 * Also truncates to 40 characters for badge readability.
 */
function escapeZpl(text: string): string {
  return text
    .replace(/\^/g, "")
    .replace(/~/g, "")
    .substring(0, 40);
}
