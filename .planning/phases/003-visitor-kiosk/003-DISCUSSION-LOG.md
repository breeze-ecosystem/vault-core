# Phase 3: Visitor Kiosk - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 3-Visitor Kiosk
**Areas discussed:** Kiosk Technology, Check-in flow, Walk-in visitors, Badge printing, QR scanning, Kiosk deployment, Notifications, Photo capture, Idle & timeout behavior, Error handling, Language

---

## Kiosk Technology

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js SPA | Reuses existing Next.js patterns, design tokens, API client. Static export served by nginx. | ✓ |
| Plain React SPA | Vite + React. Lighter but no shared patterns with dashboard. | |
| Minimal HTML/JS | Static HTML + vanilla JS. Simplest but far from codebase conventions. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Static Export | next build + nginx. No Node runtime needed in container. | ✓ |
| Standalone server | Next.js standalone output with Node.js runtime. Heavier image. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Inside monorepo | apps/kiosk/. Reuses shared config and packages. | ✓ |
| Standalone repo | Separate git repo. Independent but no code sharing. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Chromium | Fullscreen kiosk mode on the tablet device. | ✓ |
| Firefox | Fullscreen alternative, less common for kiosk. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Server + tablet browser | Container runs on server. Tablet on LAN opens URL in fullscreen browser. | ✓ |
| Dedicated hardware | Container includes browser rendering to physical display. | |

| Option | Description | Selected |
|--------|-------------|----------|
| nginx | Lightweight, production-grade static file serving. | ✓ |
| Node.js http-server | Simple but adds Node layer unnecessarily. | |

**User's choice:** Next.js SPA, static export, inside monorepo, Chromium, server + tablet browser, nginx.
**Notes:** User initially questioned what the kiosk even was — explained the concept and existing backend. Understood and approved.

---

## Check-in Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Scan QR | Visitor shows email QR on phone. | ✓ |
| Type name | Search by name. Fallback if QR lost. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm and print | Show name/host/company, confirm, print. | ✓ |
| Full details review | Show all visit info before confirm. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dual prompt | Both 'Scan QR' and 'Search by name' on welcome screen. | ✓ |
| QR-only with link | QR first, small 'lost your QR' text link. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Scan badge only | No extra tap for check-out. | ✓ |
| Scan + confirm | Show details, tap confirm. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Printing confirmation | Show 'Badge printing...' + 'Badge ready' | ✓ |
| Simple success | Just show 'Checked in' and auto-reset. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Resend QR by email | Lost QR? Search name -> resend to email. | ✓ |
| Display QR on screen | Show QR on kiosk for visitor to scan. | |

**User's choice:** QR scan primary, name + resend QR as fallback. Confirm and print. Dual prompt welcome. Scan badge only for check-out. Printing confirmation screen.
**Notes:** User clarified lost QR flow: resend to email so visitor can open on phone and scan.

---

## Walk-in Visitors

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-registration only | Must be pre-registered by host. | ✓ |
| Full walk-in support | Select host from directory, self-register. | |

**User's choice:** Pre-registration only.
**Notes:** Later in discussion, user raised event badge creation scenario (v3.1 deferred).

---

## Badge Printing

| Option | Description | Selected |
|--------|-------------|----------|
| Thermal label (ZPL) | Sticky label, fast, cheap. | ✓ |
| Full-color badge | Letter/A4 with photo, color. Slower, more expensive. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Name + host + QR + date | Simple, scannable. | ✓ |
| + company + photo | More info. Requires photo at check-in. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side via CUPS | API generates ZPL -> CUPS -> network printer. | ✓ |
| Client-side print | window.print() from browser. Less reliable. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Network printer (IP) | Printer on LAN, CUPS configured with IP. | ✓ |
| USB printer | Requires USB passthrough to Docker. | |

**User's choice:** Thermal label (ZPL), name + host + QR + date, server-side via CUPS, network printer on IP.

---

## QR Scanning

| Option | Description | Selected |
|--------|-------------|----------|
| Tablet camera (WebRTC) | No extra hardware. Camera scans from visitor phone. | ✓ |
| USB scanner | Dedicated USB scanner. More expensive. | |

| Option | Description | Selected |
|--------|-------------|----------|
| instascan | Lightweight browser QR library. | ✓ |
| html5-qrcode | Popular, supports camera + file. | |
| zxing-js/library | Google-maintained, most robust. | |

**User's choice:** Tablet camera (WebRTC) + instascan.

---

## Kiosk Deployment

| Option | Description | Selected |
|--------|-------------|----------|
| Organization API key | Read-only key via env var. Always-on auth. | ✓ |
| Kiosk user account | Dedicated login at startup. More complex. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variables | SITE_ID, API_URL, PRINTER_IP as env vars. | ✓ |
| Admin dashboard config | DB-stored config via Dashboard settings page. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-kiosk support | Each instance has unique KIOSK_ID. | ✓ |
| One kiosk per site | Simpler, one container per site. | |

**User's choice:** API key auth, env vars for config, multi-kiosk support.

---

## Notifications

| Option | Description | Selected |
|--------|-------------|----------|
| Host only | Notify the visitor's host. | ✓ |
| Host + site security | Also notify security group. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Socket.IO + email | Real-time dashboard notification + email via Resend. | ✓ |
| Socket.IO only | In-app notification only. | |

| Option | Description | Selected |
|--------|-------------|----------|
| No check-out notification | Silent check-out. | ✓ |
| Notify on check-out | Host notified when visitor leaves. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-check-in | No approval needed. QR confirm -> print. | ✓ |
| Host approval | Host must approve before badge prints. Slower. | |

**User's choice:** Host only, Socket.IO + email, no check-out notification, auto-check-in.

---

## Photo Capture

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-registered photo | Uses visitor.photoUrl from preregistration. | ✓ |
| Kiosk captures at check-in | Tablet camera takes photo on the spot. | |

**User's choice:** Pre-registered photo only.

---

## Idle & Timeout Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-reset to welcome | 60s idle -> reset to welcome screen. | ✓ |
| Screensaver then reset | Show animation, then reset. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reset on timeout | 30s idle mid-flow -> cancel session. | ✓ |
| Manual cancel only | Visitor must tap Cancel. | |

**User's choice:** Auto-reset on 60s idle. 30s mid-flow timeout cancels session.

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Error + retry | Printer error: show message + Retry button. | ✓ |
| Proceed without print | Check-in succeeds without badge. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Error + auto-retry | API unreachable: show message, auto-retry every 10s. | ✓ |
| Local queue mode | Buffer check-ins locally, sync later. Complex. | |

**User's choice:** Error screen + retry for printer. Error + auto-retry for API unreachable.

---

## Language

| Option | Description | Selected |
|--------|-------------|----------|
| French + English toggle | Language switcher on welcome screen. | ✓ |
| French only | Simpler, single language. | |

**User's choice:** French + English toggle.

---

## Agent's Discretion

- QR library details (instascan integration, camera handling)
- ZPL template design for badge layout
- CUPS printer driver configuration in Docker
- Email template for check-in notification
- nginx config structure for the Docker container
- Idle/timeout implementation (30s mid-flow, 60s welcome)

## Deferred Ideas

- **Event badge creation (v3.1):** Kiosk support for on-site badge creation tied to an event/host code. Visitors who did not pre-register can enter an event code and create a basic badge with limited privileges.
- **Bulk visitor registration via shareable link (v3.1):** Host generates a registration link, visitors self-register, kiosk handles check-in flow.
