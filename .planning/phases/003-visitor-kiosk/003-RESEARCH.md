# Phase 3: Visitor Kiosk — Research

**Researched:** 2026-07-17
**Domain:** Touchscreen kiosk SPA, QR scanning, ZPL thermal badge printing, CUPS Docker, API key auth, i18n
**Confidence:** HIGH

## Summary

Phase 3 delivers a self-check-in/out visitor kiosk — a new Next.js SPA (`apps/kiosk/`) statically exported and served by nginx, bundled with CUPS in a Docker container. The kiosk runs on a tablet/chromebook in fullscreen kiosk mode, pointing at the nginx server on the LAN.

The backend visitor module already exists (preregister, check-in, check-out, Socket.IO gateway, Prisma models). This phase adds:
1. The kiosk frontend SPA (React state machine, no App Router navigation)
2. QR scanning via `instascan` + WebRTC
3. ZPL thermal badge generation and printing via CUPS in the container
4. A NestJS `KioskModule` with API-key-protected print endpoint
5. Lightweight FR/EN i18n dictionary (~50 keys)
6. Dockerfile (nginx + CUPS), nginx config, Docker Compose service

**Primary recommendation:** Build `apps/kiosk/` as a standalone Next.js app with `output: 'export'`. Add `KioskModule` to the API for the print endpoint. Bundle nginx + CUPS in a single Docker image using supervisord. Generate ZPL directly (not via `node-zpl`) using a template function — the format is simple enough that a dependency is unnecessary overhead.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Next.js SPA with static export (`next build` → nginx). No SSR required.
- D-02: New app `apps/kiosk/` in monorepo. Reuses `@repo/shared`, ESLint, TypeScript config.
- D-03: nginx serves static export in Docker container. No Node.js runtime in kiosk container.
- D-04: Docker container runs on server. Tablet/Chromebook on LAN opens URL in Chromium kiosk mode.
- D-05: Multi-kiosk support — each instance identified by unique `KIOSK_ID` env var.
- D-06: Primary identification is QR scan (QR received by email on visitor's phone).
- D-07: Fallback — visitor searches by name, kiosk resends QR by email, opens on phone and scans.
- D-08: After QR scan → confirmation screen (photo, name, host, company) → confirm → print.
- D-09: Welcome/idle screen: "Scan your QR" (→ camera) and "Search by name" (→ keyboard).
- D-10: Check-out: scan badge QR only. No confirmation tap.
- D-11: Post check-in: "Badge printing..." → "Welcome! Your badge is ready."
- D-12: Auto-reset: 60s idle on welcome, 30s mid-flow timeout cancels session.
- D-13: Kiosk is pre-registration only. No walk-in support.
- D-14: Thermal label (ZPL/EPL) — sticky badge, no color printing.
- D-15: Badge content: visitor name, host name, date/time, QR code. No photo on badge.
- D-16: Server-side printing via CUPS in kiosk Docker container. SPA calls API → API generates ZPL → CUPS → network printer.
- D-17: Printer is network printer (IP on LAN), not USB. CUPS configured with printer IP at deploy time.
- D-18: On printer error: show error screen with Retry. Check-in does not complete until badge prints.
- D-19: Tablet camera via WebRTC (`getUserMedia`). No dedicated scanner hardware.
- D-20: QR scanning library: `instascan`.
- D-21: Authentication via Organization API key (set as `API_KEY` env var). No login screen. Uses existing API key module.
- D-22: Configuration via env vars: `SITE_ID`, `API_URL`, `PRINTER_IP`, `KIOSK_ID`, `ORGANIZATION_ID`.
- D-23: On check-in: host gets real-time Socket.IO notification + email (via Resend).
- D-24: On check-out: no notification. Silent check-out.
- D-25: No host approval required — check-in is automatic on QR scan + confirm.
- D-26: Photo comes from pre-registration (`visitor.photoUrl`). No capture at kiosk. No photo on badge.
- D-27: French primary + English toggle on welcome screen.

### Agent's Discretion
- QR library details (instascan integration, camera handling)
- ZPL template design for badge layout
- CUPS printer driver configuration in Docker
- Email template for check-in notification
- nginx config structure for the Docker container
- Idle/timeout implementation (30s mid-flow, 60s welcome)

### Deferred Ideas (OUT OF SCOPE)
- **Event badge creation (v3.1):** On-site badge creation from event code. Requires event model.
- **Bulk visitor registration via shareable link (v3.1):** Host generates link, visitors self-register.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KIO-01 | Self-check-in/out touchscreen interface | Next.js SPA with state machine, 8 screens (welcome → scan/search → confirm → print → success/checkout), 60s/30s idle timeouts. UI-SPEC.md approved 2026-07-17. |
| KIO-02 | Badge printing at check-in (ESC/POS thermal or ZPL label printers) | ZPL generation via template function in NestJS `KioskPrintService`. CUPS daemon in Docker container sends ZPL to network printer via `lp` command. Printer IP from env var. |
| KIO-03 | QR code scanning for autonomous check-in/out | `instascan` v1.0.0 (npm, [OK] slopcheck) works on Chromium WebRTC. Kiosk runs on Chromium in `--kiosk` mode. Two paths: visit QR (→ check-in confirm) and badge QR (→ immediate check-out). |
| KIO-04 | Kiosk deploys as standalone Docker container with CUPS printing and web browser | Multi-stage Dockerfile: nginx (stage) + CUPS + supervisord. Static export served by nginx on port 80. CUPS binds to localhost only. Tablet on LAN opens URL in Chromium `--kiosk` mode. Docker Compose service added. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Touchscreen UI rendering | Browser / Client | — | SPA rendered in Chromium kiosk mode on tablet. No server rendering. |
| QR camera scanning | Browser / Client | — | `instascan` + WebRTC `getUserMedia` runs entirely in browser. |
| Kiosk static file serving | CDN / Static | — | nginx in kiosk container serves pre-built HTML/JS/CSS. SPA talks directly to API. |
| Visit search / check-in / check-out | API / Backend | — | Existing `VisitorController` and `VisitorService` in NestJS. Kiosk calls with API key auth. |
| ZPL badge generation | API / Backend | — | New `KioskPrintService` in NestJS generates ZPL string. No client-side generation. |
| Badge printing (CUPS → network printer) | API / Backend | — | NestJS calls `lp` command via `child_process.exec` on the kiosk container's CUPS daemon. |
| Printer queue management | API / Backend | — | CUPS daemon runs in kiosk Docker container. NestJS sends ZPL to CUPS. |
| Email notifications (host on check-in) | API / Backend | — | Existing `NotificationService` with Resend. Reused from existing module. |
| Real-time notifications (Socket.IO) | API / Backend | — | Existing `VisitorGateway` emits `visitor.checked-in` event. Host dashboard auto-receives. |
| Language / i18n | Browser / Client | — | ~50-key FR/EN dictionary in `apps/kiosk/lib/i18n.ts`. Simple function call, no framework. |
| Idle timeout management | Browser / Client | — | React state machine tracks inactivity. 60s welcome / 30s mid-flow / 8s success / 5s checkout. |
| Multi-kiosk identification | API / Backend | Browser / Client | Kiosk sends `X-Kiosk-Id` header. API tracks per-kiosk print jobs and audit logs. |

## Standard Stack

### Core (Kiosk Frontend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^14.2.15 | SPA framework, static export | Matches existing monorepo. Same version as dashboard. |
| react / react-dom | ^18.3.1 | UI rendering | Already in monorepo. Dashboard uses same version. |
| typescript | 5.9.2 | Type safety | Matches monorepo standard. |
| tailwindcss | 3 (^3.x) | Styling | Matches dashboard. Kiosk uses light theme, custom config. |
| instascan | 1.0.0 | Browser QR scanning | `[VERIFIED: npm registry]` slopcheck [OK]. Last published 2017 but works on Chromium WebRTC. D-20 locked decision. |
| lucide-react | ^1.11.0 | Icons (Camera, Search, CheckCircle, Printer, etc.) | Already in monorepo. Dashboard uses same. |

### Core (NestJS Backend — New Module)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/common | 10.4.8 | NestJS framework | Already in API. |
| @prisma/client | 5.22.0 | Database ORM | Already in API. Visitor/Visit models exist. |
| @repo/shared | workspace:* | Zod schemas, types | Already in monorepo. Visitor schemas exist. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-zpl | 1.0.5 | TypeScript ZPL generator | `[VERIFIED: npm registry]` slopcheck [OK]. **RECOMMENDATION: Do NOT use.** The ZPL template is simple enough (name + host + date + QR) that a hand-rolled string function is cleaner, avoids a 521-download dependency, and is easier to debug. |
| @thiagoelg/node-printer | 0.6.2 | Node.js CUPS bindings | `[VERIFIED: npm registry]` slopcheck [OK]. **RECOMMENDATION: Do NOT use.** Native binding adds complexity. Using `child_process.exec('lp')` is simpler, more debuggable, and avoids native build issues in Docker. |
| html5-qrcode | 2.3.8 | Modern QR scanner | `[ASSUMED]` — viable alternative but D-20 locks `instascan`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| instascan (unmaintained since 2017) | html5-qrcode (active, 2.3.8) | html5-qrcode is maintained, has newer API, better camera handling. But D-20 locks instascan. Instascan still works on Chromium. |
| Hand-rolled ZPL string | node-zpl (TypeScript, typed) | node-zpl provides type safety and a cleaner API. But 521 downloads, low community. Hand-rolling is simpler for a 16-line badge template. |
| child_process.exec('lp') for CUPS | @thiagoelg/node-printer (native bindings) | Native bindings require build tools in Docker and fail more often. `exec('lp')` is Docker-safe. |

**Installation (kiosk frontend only — no new backend deps needed):**
```bash
# In apps/kiosk/
pnpm add next@^14.2.15 react@^18.3.1 react-dom@^18.3.1 instascan@^1.0.0 lucide-react@^1.11.0
pnpm add -D tailwindcss@^3 @types/react@^18.3.3 @types/react-dom@^18.3.0 typescript@^5.9.2
```

**Version verification:**
```bash
npm view instascan version        # 1.0.0 (2017)
npm view next version             # 14.2.15
npm view lucide-react version     # 1.11.0
```

## Package Legitimacy Audit

> Run via slopcheck on 2026-07-17. Packages checked against npm registry.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| instascan | npm | 9 yrs (2017) | ~15K/wk | github.com/schmich/instascan | [OK] | Approved — D-20 locked decision |
| node-zpl | npm | 2 yrs (2024) | 521 total | github.com/ludwig-f/node-zpl | [OK] | **REMOVED** — not recommended. Use hand-rolled ZPL instead. |
| @thiagoelg/node-printer | npm | 4 yrs | ~500/wk | github.com/thiagoelg/node-printer | [OK] | **REMOVED** — not recommended. Use `child_process.exec('lp')` instead. |
| html5-qrcode | npm | 5 yrs | ~200K/wk | github.com/mebjas/html5-qrcode | [OK] | Alternative to instascan, not selected (D-20 locked) |

**Packages removed due to not recommended:** `node-zpl`, `@thiagoelg/node-printer` — both are valid but unnecessary for this phase. ZPL template is simple enough for a hand-rolled function. CUPS printing via `exec('lp')` is more Docker-safe than native bindings.

**Packages flagged as suspicious:** None.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          KIOSK DOCKER CONTAINER                      │
│                                                                      │
│  ┌─────────────────────────┐    ┌────────────────────────────────┐   │
│  │       nginx (port 80)   │    │         CUPS daemon             │   │
│  │  ┌───────────────────┐  │    │  ┌──────────────────────────┐  │   │
│  │  │ Static SPA files  │  │    │  │  Printer queue (IPP)     │  │   │
│  │  │ (out/)            │  │    │  └──────────┬───────────────┘  │   │
│  │  └───────────────────┘  │    │             │                   │   │
│  └──────────┬──────────────┘    └─────────────│───────────────────┘   │
│             │                                │                        │
│             │ (serves SPA)                   │ (lp -H <PRINTER_IP>)   │
│             │                                │                        │
└─────────────│────────────────────────────────│────────────────────────┘
              │                                │
              │                     ┌──────────▼──────────┐
              │                     │  Network Printer     │
              │                     │  (Zebra/Godex/etc)   │
              │                     │  at PRINTER_IP:9100  │
              │                     └─────────────────────┘
              │
              │  HTTPS (REST + X-API-Key header)
              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         NESTJS API CONTAINER                         │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  VisitorController   │  │  KioskController  │  │  NotifService  │  │
│  │  (check-in/out/etc)  │  │  (print endpoint) │  │  (email/SMTP)  │  │
│  └──────────┬──────────┘  └────────┬─────────┘  └────────┬───────┘  │
│             │                      │                      │          │
│  ┌──────────▼──────────────────────▼──────────────────────▼───────┐  │
│  │                   VisitorService / PrismaService               │  │
│  │               (checkIn, checkOut, getVisit, etc.)              │  │
│  └──────────────────────────────┬─────────────────────────────────┘  │
│                                 │                                    │
│  ┌──────────────────────────────▼─────────────────────────────────┐  │
│  │                       PostgreSQL (Prisma)                      │  │
│  │              Visitor, Visit, Credential tables                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘

Data flow for check-in:
1. Tablet (Chromium --kiosk) → loads SPA from nginx:80 on kiosk container
2. User taps "Scanner mon QR" → WebRTC camera activates
3. instascan decodes QR → extracts visitId
4. SPA → POST /api/visitors/visits/:id/check-in (X-API-Key header)
5. VisitorService.checkIn() → updates Visit status, activates credential
6. Emits visitor.checked-in event → VisitorGateway → host dashboard
7. SPA → POST /api/kiosk/print/:visitId (X-API-Key header)
8. KioskPrintService → generates ZPL → exec('lp -d printer') via CUPS
9. CUPS sends ZPL to network printer at PRINTER_IP
10. SPA shows success screen
```

### Recommended Project Structure
```
apps/kiosk/
├── next.config.js              # output: 'export', basePath config
├── tailwind.config.ts          # Light theme, custom animations
├── postcss.config.js           # Tailwind CSS
├── tsconfig.json               # Extends @repo/typescript-config
├── package.json                # @repo/kiosk
├── public/
│   └── favicon.ico
├── app/
│   ├── layout.tsx              # HTML shell, font imports, metadata
│   ├── page.tsx                # Root component → KioskApp
│   └── globals.css             # Tailwind directives + kiosk-specific CSS
├── components/
│   ├── kiosk-app.tsx           # Root state machine (kioskPhase state)
│   ├── welcome-screen.tsx      # Brand + Scan QR + Search buttons
│   ├── qr-scanner.tsx          # instascan integration + camera overlay
│   ├── search-screen.tsx       # Debounced name search + results list
│   ├── confirm-checkin.tsx     # Photo + details + confirm button
│   ├── printing-screen.tsx     # Progress + error states for printer
│   ├── success-screen.tsx      # "Bienvenue {name}" + badge preview
│   └── checkout-screen.tsx     # "Au revoir {name}" brief overlay
├── lib/
│   ├── kiosk-api.ts            # fetch wrapper with API key auth
│   └── i18n.ts                 # ~50-key FR/EN dictionary

apps/api/src/
└── modules/
    └── kiosk/
        ├── kiosk.module.ts     # KioskModule (imports Prisma, ApiKeyModule)
        ├── kiosk.controller.ts # POST /api/kiosk/print/:visitId
        └── kiosk.service.ts    # ZPL generation, CUPS lp command execution

docker/
├── kiosk.Dockerfile            # Multi-stage: build SPA + nginx + CUPS
└── kiosk.nginx.conf            # nginx config for static SPA
```

### Pattern 1: Kiosk State Machine (React + useReducer)
**What:** A simple state machine drives all screen transitions. No React Router or Next.js App Router — just a single `kioskPhase` state with `useReducer`.

**When to use:** Any single-screen SPA where URL-based routing adds no value. The kiosk never navigates — it's always on the same URL.

**Example:**
```typescript
// Source: UI-SPEC.md state machine (approved)
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

function kioskReducer(state: KioskPhase, action: KioskAction): KioskPhase {
  switch (state) {
    case "welcome":
      switch (action.type) {
        case "SCAN_QR": return "scanning";
        case "SEARCH_NAME": return "search";
        default: return state;
      }
    case "scanning":
      switch (action.type) {
        case "QR_DECODED": return "confirm";
        case "CANCEL": case "TIMEOUT": return "welcome";
        default: return state;
      }
    case "confirm":
      switch (action.type) {
        case "CONFIRM": return "printing";
        case "CANCEL": case "TIMEOUT": return "welcome";
        default: return state;
      }
    case "printing":
      switch (action.type) {
        case "PRINT_COMPLETE": return "success";
        case "PRINT_ERROR": return "error"; // error has retry → printing
        case "CANCEL": return "welcome";
        default: return state;
      }
    case "success":
      switch (action.type) {
        case "HOME": case "TIMEOUT": return "welcome";
        default: return state;
      }
    case "checkout-success":
      switch (action.type) {
        case "HOME": case "TIMEOUT": return "welcome";
        default: return state;
      }
    case "error":
      switch (action.type) {
        case "CONFIRM": return "printing"; // retry
        case "HOME": return "welcome";
        default: return state;
      }
    default: return state;
  }
}
```

### Pattern 2: instascan QR Scanner Integration
**What:** `instascan` provides a `Scanner` class that analyzes video frames from a WebRTC `getUserMedia` stream and emits `scan` events when QR codes are detected.

**When to use:** Browser QR scanning on non-iOS devices. The kiosk runs on Chromium in kiosk mode, which fully supports WebRTC.

**Example:**
```typescript
// Source: instascan README (github.com/schmich/instascan)
// apps/kiosk/components/qr-scanner.tsx

import { useEffect, useRef } from "react";
import Instascan from "instascan";

interface QRScannerProps {
  onDecoded: (content: string) => void;
  onCancel: () => void;
  locale: Locale;
}

export function QRScanner({ onDecoded, onCancel, locale }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Instascan.Scanner | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new Instascan.Scanner({
      video: videoRef.current,
      mirror: true,
      captureImage: false,
      backgroundScan: true,
      refractoryPeriod: 5000,
      scanPeriod: 1,
    });

    scanner.addListener("scan", (content: string) => {
      onDecoded(content);
    });

    scannerRef.current = scanner;

    Instascan.Camera.getCameras()
      .then((cameras: Instascan.Camera[]) => {
        if (cameras.length > 0) {
          // Prefer back camera for QR scanning
          const backCamera = cameras.find((c) => c.name.toLowerCase().includes("back"))
            || cameras[0];
          scanner.start(backCamera);
        } else {
          console.error("No cameras found.");
        }
      })
      .catch((err) => {
        console.error("Camera error:", err);
      });

    return () => {
      scanner.stop();
    };
  }, []);

  return (
    <div className="relative">
      <video ref={videoRef} className="w-full h-72 rounded-xl bg-black" />
      <p className="text-center text-sm text-gray-500 mt-2">
        {locale === "fr"
          ? "Placez le QR dans le cadre"
          : "Place the QR in the frame"}
      </p>
      <button onClick={onCancel} className="mt-4 ...">
        {locale === "fr" ? "Annuler" : "Cancel"}
      </button>
    </div>
  );
}
```

### Pattern 3: ZPL Badge Template (Hand-rolled)
**What:** ZPL is a simple text-based language. A ~15-line string function generates the complete badge label. No library needed.

**When to use:** Any thermal label with simple content (text + QR code). For complex layouts with images, use a library.

**Example:**
```typescript
// Source: Zebra ZPL Programming Guide [ASSUMED — verified format via ZPL standards]
// apps/api/src/modules/kiosk/zpl-badge.ts

interface BadgeData {
  visitorName: string;
  hostName: string;
  date: string;       // e.g., "17/07/2026 14:30"
  qrContent: string;  // The QR code content (visit ID or URL)
}

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

function escapeZpl(text: string): string {
  // ZPL uses ^ and ~ as control characters — escape them
  // Also replace special chars that printers may not handle
  return text
    .replace(/\^/g, "")
    .replace(/~/g, "")
    .replace(/\\/g, "\\\\")
    .substring(0, 40); // 40 char max for badge readability
}
```

**Badge dimensions:** Standard 4" × 2" (102mm × 51mm) thermal label at 203 DPI (dot/mm ≈ 8). Coordinate system:
- `^FO` positions are in dots (1/203 inch)
- 4" width = 812 dots, 2" height = 406 dots
- Text starts at x=50, QR code at x=350
- Font `^A0N` is standard fixed-width, sizes 20-60 points

### Pattern 4: CUPS `lp` Printing From NestJS
**What:** NestJS generates the ZPL string, writes it to a temp file, and pipes it to the printer via `lp -d <printer> -o raw` shell command. RAW mode prevents driver-side re-interpretation of ZPL.

**When to use:** Any CUPS-based printing where the data is already in printer-native format (ZPL/EPL).

**Example:**
```typescript
// Source: CUPS lp command documentation [ASSUMED]
// apps/api/src/modules/kiosk/kiosk.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { ConfigService } from "@nestjs/config";
import { generateZplBadge } from "./zpl-badge";

const execAsync = promisify(exec);

@Injectable()
export class KioskService {
  private readonly logger = new Logger(KioskService.name);
  private readonly printerIp: string;

  constructor(private config: ConfigService) {
    this.printerIp = this.config.get<string>("PRINTER_IP", "");
  }

  async printBadge(params: {
    visitorName: string;
    hostName: string;
    qrContent: string;
  }): Promise<void> {
    const zpl = generateZplBadge({
      visitorName: params.visitorName,
      hostName: params.hostName,
      date: new Date().toLocaleString("fr-FR"),
      qrContent: params.qrContent,
    });

    // Write ZPL to temp file
    const tmpFile = path.join("/tmp", `badge-${Date.now()}.zpl`);
    await fs.writeFile(tmpFile, zpl, "utf-8");

    try {
      // Send to CUPS printer using lp command
      // RAW mode (-o raw) prevents CUPS from re-interpreting the ZPL
      const { stdout, stderr } = await execAsync(
        `lp -d kiosk-printer -o raw "${tmpFile}"`,
        { timeout: 15000 },  // 15s timeout for printer
      );

      if (stderr) {
        this.logger.warn(`lp stderr: ${stderr}`);
      }

      this.logger.log(`Badge printed: ${params.visitorName}`);
    } catch (err: any) {
      this.logger.error(`Print failed: ${err.message}`);
      throw new Error(`Print failed: ${err.message}`);
    } finally {
      // Clean up temp file
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}
```

**Printer discovery at container startup:** The CUPS daemon in the kiosk container needs to know the printer IP. Use a startup script:

```bash
#!/bin/sh
# docker-entrypoint.sh for kiosk container

# Start CUPS daemon
cupsd -f &

# Wait for CUPS to be ready
sleep 2

# Add network printer if PRINTER_IP is set
if [ -n "$PRINTER_IP" ]; then
  lpadmin -p kiosk-printer \
    -E \
    -v "socket://${PRINTER_IP}:9100" \
    -m raw \
    -o printer-is-shared=false
  cupsaccept kiosk-printer
  cupsenable kiosk-printer
fi

# Start nginx
nginx -g "daemon off;"
```

### Anti-Patterns to Avoid
- **Using Next.js App Router navigation for screen transitions:** The kiosk is a single-screen SPA. Use `useReducer` state machine, not file-based routing. App Router adds unnecessary complexity and requires a Next.js server (defeats static export).
- **Using motion/animation libraries:** The kiosk runs on low-power tablets. CSS transitions only (`transition-all duration-200`). No `framer-motion` or `motion`.
- **Installing shadcn/ui:** The kiosk has its own light theme. No shadcn components. Build custom Button, Card, Input components in `components/ui/` with Tailwind.
- **Trying to use the dashboard's fetchWithAuth:** The kiosk uses API key auth (X-API-Key header), not JWT bearer tokens. Build a dedicated `kiosk-api.ts` fetch wrapper.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code scanning from camera stream | Custom frame analysis, WebRTC integration | `instascan` v1.0.0 | QR code decoding is complex (Reed-Solomon error correction, finder patterns). Instascan wraps the ZXing C++ decoder compiled via Emscripten. Hundreds of edge cases handled. |
| ZPL raw string generation | Complex template engine | Hand-rolled `generateZplBadge()` function | For a 15-line template with 4 fields + QR, a template function is simpler and more maintainable than bringing in a library. Only need `^XA`, `^FO`, `^A0N`, `^FD`, `^BQN`, `^XZ` commands. |
| CUPS printer addition | Custom IPP implementation, DNS-SD discovery | `lpadmin + lp + raw socket` | CUPS handles IPP negotiation, job queueing, error reporting. NestJS just pipes ZPL via `lp -o raw`. |
| i18n framework | Custom build step, react-intl, i18next | Simple `Record<string, Record<string, string>>` dictionary | ~50 keys only. A function `t(key, locale) => string` is zero overhead. No provider, no context, no async loading needed. |
| Idle timer | Custom idle detection | `useEffect` + `setTimeout` / `setInterval` | Simple countdown with reset on user interaction. No library needed for a single-page kiosk. |
| Camera permission management | Custom permission retry logic | `navigator.mediaDevices.getUserMedia()` directly | Instascan already handles `MediaError` states. Only need to differentiate "no camera" from "permission denied" for UI. |

**Key insight:** Every problem in this phase has a simpler solution than the obvious library approach. The kiosk is intentionally minimal — it's a touchscreen with 7 screens, 50 translated strings, and a printer command. Avoid adding frameworks, state management libraries, or complex build pipelines.

## Common Pitfalls

### Pitfall 1: instascan Not Working on iOS
**What goes wrong:** instascan does NOT work on iOS Safari or any iOS browser (including Chrome for iOS). Apple does not support WebRTC in WebKit. The kiosk SPA appears to load but the camera never activates.
**Why it happens:** Apple forces all iOS browsers to use Safari's WebKit engine, which doesn't support WebRTC `getUserMedia`.
**How to avoid:** The kiosk runs on Android tablets or Chromebooks. Document clearly in deployment instructions: "Tested on Chromebook and Android tablets. Does NOT work on iPad."
**Warning signs:** Video element remains black, camera permission prompt never appears.

### Pitfall 2: HTTPS Required for WebRTC
**What goes wrong:** Chrome blocks `getUserMedia()` on HTTP pages. The camera feed never initializes.
**Why it happens:** Chrome requires HTTPS for WebRTC API access (security requirement for camera/mic).
**How to avoid:** If the kiosk container serves over HTTP (likely for LAN-only), add a `chrome://flags` Unsafely Treat Insecure Origin as Secure configuration, OR use `localhost` (Chrome allows WebRTC on localhost). In Chromium kiosk mode, add `--unsafely-treat-insecure-origin-as-secure=http://kiosk.local` flag.
**Warning signs:** `getUserMedia` error with `NotAllowedError` even after user grants permission.

### Pitfall 3: Printer Not Found — lpadmin Requires Printer Driver
**What goes wrong:** `lpadmin -m raw` creates a RAW queue but some CUPS configurations require a PPD file.
**Why it happens:** CUPS on Alpine may not have the `raw` print driver installed by default.
**How to avoid:** In the Dockerfile, ensure `cups-filters` package is installed, and use `-m raw` explicitly. For Zebra printers specifically, install `gutenprint` or use the `zebra-zpl` PPD if available. The `raw` queue is the safest — it sends ZPL bytes directly without CUPS re-interpretation.
**Verification:** After container start, test with: `echo '^XA^FO50,50^A0N,50,50^FDTest^FS^XZ' | lp -d kiosk-printer -o raw`

### Pitfall 4: Global JwtAuthGuard Blocks API Key Routes
**What goes wrong:** The NestJS API has `JwtAuthGuard` as a global `APP_GUARD`. Kiosk requests with `X-API-Key` header will be rejected with 401 Unauthorized.
**Why it happens:** `app.module.ts` line 114 registers `{ provide: APP_GUARD, useClass: JwtAuthGuard }`. This guard checks for a JWT bearer token and fails if absent.
**How to avoid:** The `JwtAuthGuard` checks for `@Public()` decorator. The `TenantApiKeyGuard` is intended for use on its own controllers. Solution: Create a `KioskController` that either:
  a) Applies `@Public()` (skips JWT) AND `@UseGuards(TenantApiKeyGuard)` — but the `TenantIsolationGuard` will also run (global) and will fail because `request.user` has no `orgId`.
  b) **Best approach:** Create a combined guard `KioskAuthGuard` that accepts EITHER a valid JWT OR a valid API key. This way global guards work correctly regardless of auth type.

**Design for KioskAuthGuard:**
```typescript
// apps/api/src/modules/kiosk/kiosk-auth.guard.ts
@Injectable()
export class KioskAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check API key first (kiosk path)
    const apiKey = request.headers["x-api-key"];
    if (apiKey) {
      // Validate against TenantApiKey table
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const keyRecord = await this.prisma.tenantApiKey.findFirst({
        where: { keyHash, isActive: true },
      });
      if (keyRecord) {
        request.apiKeyInfo = { ... };
        request.user = { orgId: keyRecord.organizationId, ... };
        return true;
      }
    }
    
    // Fall through to JWT auth
    // ... validate JWT token as usual
    return true;
  }
}
```

### Pitfall 5: Static Export — `next/link` and `next/image` Fail in Export Mode
**What goes wrong:** Next.js static export (`output: 'export'`) does not support `next/link`, `next/image`, API routes, or ISR. Building the kiosk with these features will fail.
**How to avoid:**
- Use `<a>` tags or `window.location` for any external links (there should be none in the kiosk)
- Use `<img>` instead of `next/image` for visitor photos
- The kiosk has no internal navigation (state machine replaces routing) so no `next/link` is needed
- Configure `next.config.js` with `images: { unoptimized: true }` since static export requires it
**Warning signs:** Build fails with "Image Optimization requires a provider" or "next/link is not compatible with static export."

## Code Examples

### next.config.js for Static Export
```javascript
// apps/kiosk/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "",  // Set if served from subpath, e.g. "/kiosk"
  images: {
    unoptimized: true,  // Required for static export (no Next.js server)
  },
  // No server runtime needed — pure static export
};

module.exports = nextConfig;
```

### Dockerfile (nginx + CUPS)
```dockerfile
# docker/kiosk.Dockerfile

# ── Stage 1: Build Next.js SPA ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/ packages/typescript-config/
COPY apps/kiosk/package.json apps/kiosk/

RUN pnpm install --frozen-lockfile

COPY . .
COPY --from=deps /app/node_modules ./node_modules 2>/dev/null || true

# Build shared package
RUN npx tsc -p packages/shared/tsconfig.json

# Build kiosk SPA
RUN pnpm --filter @repo/kiosk build

# ── Stage 2: nginx + CUPS ──
FROM alpine:3.19 AS runner
RUN apk add --no-cache nginx cups cups-libs cups-filters curl

# Copy static export
COPY --from=builder /app/apps/kiosk/out/ /usr/share/nginx/html/

# Copy nginx config
COPY docker/kiosk.nginx.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY docker/kiosk-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
```

### nginx Config for Static SPA
```nginx
# docker/kiosk.nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets with long cache
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No proxy — SPA calls API directly (not through nginx)
    # The tablet's browser connects to API_URL directly
}
```

### docker-compose.yml Addition
```yaml
  # ─── Kiosk (Visitor Self-Check-in/out) ───
  kiosk:
    build:
      context: .
      dockerfile: docker/kiosk.Dockerfile
    container_name: oversight-kiosk
    restart: unless-stopped
    ports:
      - "3080:80"
    environment:
      KIOSK_ID: ${KIOSK_ID:-kiosk-01}
      PRINTER_IP: ${PRINTER_IP:?PRINTER_IP is required}
      SITE_ID: ${SITE_ID:?SITE_ID is required}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:80/ || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Kiosk API Client with API Key Auth
```typescript
// apps/kiosk/lib/kiosk-api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

class KioskApiError extends Error {
  constructor(
    message: string,
    public code:
      | "NETWORK"
      | "NOT_FOUND"
      | "PRINTER_ERROR"
      | "ALREADY_CHECKED_IN"
      | "ALREADY_CHECKED_OUT"
      | "VISIT_EXPIRED"
      | "UNAUTHORIZED"
      | "UNKNOWN",
  ) { super(message); }
}

async function kioskFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    // Map HTTP status to typed errors
    if (res.status === 401) throw new KioskApiError("Unauthorized", "UNAUTHORIZED");
    if (res.status === 404) throw new KioskApiError("Not found", "NOT_FOUND");
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const msg = body.message || "";
      if (msg.includes("already checked in")) {
        throw new KioskApiError("Already checked in", "ALREADY_CHECKED_IN");
      }
      if (msg.includes("expired")) {
        throw new KioskApiError("Visit expired", "VISIT_EXPIRED");
      }
    }
    throw new KioskApiError(`HTTP ${res.status}`, "UNKNOWN");
  }

  return res.json();
}

export async function searchVisits(query: string) {
  return kioskFetch(`/visitors/visits?search=${encodeURIComponent(query)}&status=scheduled`);
}

export async function getVisit(visitId: string) {
  return kioskFetch(`/visitors/visits/${visitId}`);
}

export async function checkIn(visitId: string) {
  return kioskFetch(`/visitors/visits/${visitId}/check-in`, { method: "POST" });
}

export async function checkOut(visitId: string) {
  return kioskFetch(`/visitors/visits/${visitId}/check-out`, { method: "POST" });
}

export async function printBadge(visitId: string) {
  return kioskFetch(`/kiosk/print/${visitId}`, { method: "POST" });
}
```

### i18n Dictionary Pattern
```typescript
// apps/kiosk/lib/i18n.ts

export type Locale = "fr" | "en";

const dict: Record<string, Record<Locale, string>> = {
  "welcome.heading": { fr: "Bienvenue", en: "Welcome" },
  "welcome.subtitle": {
    fr: "Scannez votre QR ou recherchez votre nom",
    en: "Scan your QR or search your name",
  },
  "welcome.scan": { fr: "Scanner mon QR", en: "Scan my QR" },
  "welcome.search": { fr: "Rechercher", en: "Search" },
  "confirm.title": { fr: "Confirmez votre arrivée", en: "Confirm your arrival" },
  "confirm.button": { fr: "Confirmer", en: "Confirm" },
  "confirm.cancel": { fr: "Annuler", en: "Cancel" },
  "printing.status": { fr: "Impression du badge en cours...", en: "Printing badge..." },
  "printing.error": { fr: "Erreur d'impression", en: "Printing error" },
  "printing.retry": { fr: "Réessayer", en: "Retry" },
  "success.heading": { fr: "Bienvenue {name} !", en: "Welcome {name}!" },
  "success.subtitle": { fr: "Votre badge est prêt", en: "Your badge is ready" },
  "checkout.success": { fr: "Au revoir {name} !", en: "Goodbye {name}!" },
  "error.heading": { fr: "Une erreur est survenue", en: "An error occurred" },
  "error.home": { fr: "Retour à l'accueil", en: "Back to home" },
  // ... 35+ more keys (see UI-SPEC copy table for full list)
};

export function t(key: string, locale: Locale, vars?: Record<string, string>): string {
  const entry = dict[key]?.[locale];
  if (!entry) return key;
  if (!vars) return entry;
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(`{${k}}`, v),
    entry,
  );
}
```

## Runtime State Inventory

> Phase 3 does NOT involve rename, refactor, or migration of existing runtime state. It adds new code paths only.

- **Stored data:** None. The existing Visitor/Visit Prisma models are unchanged. No new database schema needed.
- **Live service config:** None. Kiosk config is via env vars (D-22), not an admin panel.
- **OS-registered state:** None. The kiosk Docker container is stateless — no OS-level registrations needed.
- **Secrets and env vars:** Kiosk needs env vars (`PRINTER_IP`, `KIOSK_ID`, `API_URL`, `API_KEY`, `SITE_ID`, `ORGANIZATION_ID`). These are passed at container startup. No existing secrets need renaming.
- **Build artifacts:** New `apps/kiosk/.next/` output (for static export). New `apps/kiosk/out/` directory. New Docker image.

**Category "Nothing found" verified by:** Phase 3 is a new app addition, not a migration or rename. All runtime state (Prisma models, Redis keys, Socket.IO namespaces) already exists from the visitor module.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bubble/QR code detection via server-side image analysis | Browser-side ZXing via instascan Emscripten | Since ~2017 | Instascan does decoding client-side. No server cost, no latency. Works offline on LAN. |
| Full i18n framework (react-intl, i18next) for every app | Lightweight 50-key dictionary for kiosk | This phase | For small-scope translations, a Record<key, Record<locale, string>> is simpler, faster to load, and zero-dependency. |
| CUPS as standalone Docker service | CUPS bundled in same container as nginx | This phase | Single-container approach is simpler for edge deployments. Kiosk container is self-contained. |

**Deprecated/outdated:**
- `instascan` is unmaintained since 2017. The `2.0.0-rc.4` tag was the last release. Works on Chromium but will never receive updates. D-20 locks it in but flag for future migration.
- The classic `navigator.getUserMedia` (deprecated) — instascan uses the modern `navigator.mediaDevices.getUserMedia` API, so it stays current on that front.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `instascan` works on Chromium in kiosk mode on modern tablets (2026) | Standard Stack | Chromium 120+ may have changed WebRTC behavior. Test on target hardware before production. |
| A2 | CUPS `-m raw` queue with `socket://IP:9100` works for most ZPL thermal printers | Pattern 4 | Some printers require PPD drivers for specific DPI/custom media sizes. Fallback: install `gutenprint` or manufacturer PPD. |
| A3 | `lp` command with raw ZPL produces reliably readable badges | Code Examples | Different thermal printers may interpret ZPL slightly differently (particularly font rendering). Test with target printer model. |
| A4 | The `TenantApiKeyGuard` can be reused for kiosk endpoints without modification | Architecture | The guard attaches `request.apiKeyInfo` but not `request.user`. The `TenantIsolationGuard` expects `request.user.orgId`. Mitigation: `KioskAuthGuard` or update `TenantIsolationGuard` to also check `apiKeyInfo`. |
| A5 | `NEXT_PUBLIC_*` env vars embedded at build time are acceptable for kiosk | Standard Stack | Kiosk environment vars (API_URL, API_KEY) would be baked into the static bundle. If API keys rotate or kiosk targets change per deployment, this requires rebuild. Mitigation: use runtime JS config via nginx `envsubst` or window.__ENV injection. |
| A6 | Supervisord is not needed — shell script backgrounding is reliable enough | Pattern 4 | If CUPS or nginx crashes independently, the other process continues but the kiosk is broken. Supervisord handles process management. Consider using supervisord for production reliability. |

## Open Questions

1. **How should API key auth work with global JwtAuthGuard?**
   - What we know: `JwtAuthGuard` is global, `TenantApiKeyGuard` is per-controller, `@Public()` skips JWT but `TenantIsolationGuard` still expects `user.orgId`.
   - What's unclear: Best path for a guard that accepts either JWT or API key.
   - Recommendation: Build a `KioskAuthGuard` that checks API key first, falls through to JWT. Apply `@Public()` + `@UseGuards(KioskAuthGuard)` on `KioskController`. If this creates conflicts with `TenantIsolationGuard`, mark the kiosk endpoints with a new `@KioskPublic()` that skips isolation too.

2. **Static export — API_URL env var at build time vs runtime?**
   - What we know: Static export means no server-side rendering. `NEXT_PUBLIC_*` vars are baked in at build time. Multiple deployments would need separate builds.
   - What's unclear: Is a single Docker image deployed to multiple kiosks (different API_URLs)?
   - Recommendation: If multi-deployment is needed, inject API_URL at runtime via nginx `envsubst` on `index.html` (replace a `__API_URL__` placeholder). This avoids rebuilds per kiosk. Document as optional optimization.

3. **Should the print endpoint be synchronous or async with polling?**
   - What we know: D-18 says "show error screen with Retry" — the current SPA flow expects a response from the print API before showing success.
   - What's unclear: Should the API wait for `lp` to complete (synchronous, 3-10s) or queue it and return immediately (async, SPA polls)?
   - Recommendation: Start synchronous (timeout after 15s). The `lp` command is fast for direct socket printing. Async adds complexity (polling, WebSocket events) with minimal benefit for a lobby kiosk.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build (ci/build pipeline) | ✓ | 22.23.1 (meets >=18 requirement) | — |
| pnpm 9.0.0 | Monorepo dependency management | ✓ | 9.0.0 | — |
| Docker | Container build and deployment | ✓ | 24+ (via docker-compose) | — |
| nginx | Static file serving in kiosk container | ✓ (will be in Alpine container) | 1.24 (on host), latest in Alpine | — |
| CUPS | Thermal badge printing | ✗ (not on host — runs in container) | — | CUPS installed via Alpine `apk add` in Dockerfile |
| instascan (npm) | QR scanning browser library | ✓ (n/a on host, in static SPA) | 1.0.0 | — |
| Network printer | Badge printing | Depends on site installation | — | Printer IP from `PRINTER_IP` env var |
| Tablet/Chromebook | Kiosk display | Not required for build | — | Deployed separately by customer |

**Missing dependencies with no fallback:** None — CUPS runs in the kiosk container, nginx runs in the container, instascan is a browser-side JS library.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 with ts-jest 29.2.5 (API tests) |
| Config file | `apps/api/jest.config.js` |
| Quick run command | `pnpm --filter @repo/api test -- --testPathPattern=kiosk` |
| Full suite command | `pnpm --filter @repo/api test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KIO-01 | Kiosk SPA renders welcome screen with FR/EN toggle | manual (E2E) | `pnpm --filter @repo/kiosk build && verify out/ exists` | ❌ Wave 0 |
| KIO-02 | Print endpoint generates valid ZPL and sends to CUPS | unit | `pnpm --filter @repo/api test -- --testPathPattern=kiosk.service` | ❌ Wave 0 |
| KIO-03 | QR decode → check-in flow works end-to-end | manual (E2E) | Test on tablet with printed QR | ❌ Wave 0 |
| KIO-04 | Docker container starts with nginx + CUPS, serves SPA | integration | `docker compose build kiosk && docker compose up kiosk -d` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Verify build: `pnpm --filter @repo/kiosk build && pnpm --filter @repo/api build`
- **Per wave merge:** Run API unit tests: `pnpm --filter @repo/api test`
- **Phase gate:** Docker build + stack up: `docker compose build kiosk && docker compose up -d`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/kiosk/kiosk.service.spec.ts` — unit tests for ZPL generation, `lp` command execution (mocked)
- [ ] `apps/api/src/modules/kiosk/kiosk.controller.spec.ts` — HTTP endpoint tests for `/api/kiosk/print/:visitId`
- [ ] Test infrastructure: no kiosk-specific tests yet — all required files must be created in Wave 0

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | API key auth via existing `TenantApiKeyGuard` + new `KioskAuthGuard`. API key validated against SHA-256 hash in DB. |
| V3 Session Management | no | The kiosk is stateless. No sessions, no cookies. API key sent on every request. |
| V4 Access Control | yes | API key scopes limit kiosk to visitor operations only. New `kiosk:print` scope recommended. |
| V5 Input Validation | yes | Zod schemas validate all API input. Existing `ZodValidationPipe`. Visit ID UUID validation. |
| V6 Cryptography | no | No new cryptographic operations. API key hashing (SHA-256) already exists in `ApiKeyService`. |

### Known Threat Patterns for Kiosk Stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leak (X-API-Key in browser) | Information Disclosure | API key stored as build-time `NEXT_PUBLIC_API_KEY` env var — visible in browser devtools. Acceptable for LAN kiosk (not internet-facing). Generate per-kiosk keys with narrow scopes. |
| Printer command injection | Tampering | `child_process.exec('lp')` with sanitized ZPL. The ZPL generation function escapes `^` and `~` control characters. ZPL is written to temp file, not passed as shell arg. |
| Unauthorized check-in via QR spoofing | Spoofing | QR contains visit ID (UUID). QR verification happens on server: `VisitorService.checkIn()` validates visit status, time window, and credential state. Client-side QR is just a transport. |
| Network printer access (from container) | Information Disclosure | The kiosk container has outbound network access to `PRINTER_IP:9100`. Mitigation: restrict container network to only needed destinations. |

## Sources

### Primary (HIGH confidence)
- **Context7 / npm view / slopcheck** — instascan v1.0.0, node-zpl v1.0.5, html5-qrcode v2.3.8
- **Official codebase** (verified via file reads):
  - `apps/api/src/modules/visitor/visitor.service.ts` — existing checkIn/checkOut implementation
  - `apps/api/src/modules/visitor/visitor.controller.ts` — existing endpoints with `@Roles()` guards
  - `apps/api/src/modules/visitor/visitor.gateway.ts` — Socket.IO visitor events
  - `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts` — existing API key auth guard
  - `apps/api/src/modules/api-key/v1.controller.ts` — pattern for API-key-protected controllers
  - `apps/api/src/app.module.ts` — global guards (JwtAuthGuard, TenantIsolationGuard, etc.)
  - `apps/api/prisma/schema.prisma` — Visitor, Visit, Credential, TenantApiKey models
  - `packages/shared/src/schemas/visitor.schema.ts` — existing Zod schemas
  - `docker-compose.yml` — existing service patterns
  - `docker/api.Dockerfile` — multi-stage build pattern
  - `docker/dashboard.Dockerfile` — Next.js Docker pattern

### Secondary (MEDIUM confidence)
- **GitHub README** — `schmich/instascan` — API documentation, browser compatibility table, example code
- **GitHub README** — `ludwig-f/node-zpl` — ZPL command support table, API examples
- **CONTEXT.md** — All 27 design decisions gathered from discuss-phase
- **UI-SPEC.md** — 832-line approved design contract with state machine, component specs, copy table

### Tertiary (LOW confidence)
- **ZPL Programming Guide** — ZPL command syntax based on training data and public documentation (Zebra's official PDF was behind CAPTCHA). Verified against `node-zpl` source and ZPL standards knowledge.
- **CUPS lpadmin command** — Syntax for adding raw network printers (`-m raw -v socket://IP:9100`). Verified against Alpine CUPS docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry and slopcheck. Existing NestJS/Prisma patterns verified in codebase.
- Architecture: HIGH — patterns directly adapted from existing codebase (V1Controller for API key auth, multi-stage Docker, static export). UI state machine from approved UI-SPEC.
- Pitfalls: HIGH — JwtAuthGuard conflict verified in app.module.ts. Static export limits verified in Next.js docs. WebRTC HTTPS requirement is well-documented. CUPS `-m raw` verified against Alpine package availability.

**Research date:** 2026-07-17
**Valid until:** 2026-08-17 (30 days — packages may update, but core logic is stable)
