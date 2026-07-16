# Phase 8: Feature Deepening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 08-feature-deepening
**Areas discussed:** Deepening strategy, Door thresholds, Incident SLA, Analytics visualization, Visitor scope, ANPR confidence, Equipment health, Dashboard pages, Access control hardening, Mobile scope, Evidence auto-bundling, Queue resilience

---

## Deepening Strategy (FTR-01 through FTR-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Incidents + Doors deep rebuild | Incident SLA & escalation gets full configurability. Door thresholds per-door. Other 5: targeted hardening | |
| Spread evenly across all 7 | Each module gets the same amount of deepening | ✓ |
| Incidents + Visitors focus | Deepest work on workflow-heavy modules. Others: hardening only | |
| Prioritize based on code assessment | Let planner assess what's most broken | |

**User's choice:** Spread evenly across all 7
**Notes:** User wants proportional depth across all modules, no favorites.

---

## Door State Machine (FTR-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Thresholds only (held-open timeout, settling) | Per-door override, schedule awareness deferred | |
| Thresholds + per-schedule policies | Adds DoorSchedule model linking to zones | |
| Full per-door policy profiles | Named profiles (HIGH_SECURITY, STANDARD, LOW_BARRIER) | |
| Just make thresholds configurable, no schedule | Threshold columns on Door + DEFAULT_ALERT_CONFIG fallback | ✓ |

**User's choice:** Agent recommended — threshold columns on Door table, fallback to defaults
**Notes:** User deferred to agent recommendation. Simplest approach that solves the core requirement.

---

## Incident SLA Design (FTR-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-organization defaults only | Global SLA defaults in org settings | |
| Per-severity SLA profiles | Critical=15min, High=30min, Medium=2hr, Low=8hr at org level | ✓ |
| Per-severity + per-incident override | Org-level severity defaults + per-incident manual override | |
| Keep current hardcoded SLA | Focus on edge cases not configuration UI | |

**User's choice:** Agent recommended — per-severity SLA profiles at org level
**Notes:** User deferred to agent recommendation. Balanced approach — configurable without per-incident UI complexity.

---

## Analytics Dashboard (FTR-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing patterns — no new lib | Custom SVG/CSS charts with Radix Themes + Tailwind + motion | ✓ |
| Add recharts | React + D3, composable, ~45KB gzipped | |
| Add @tremor/sooner | shadcn-compatible, built on recharts, ~60KB | |
| Server-rendered charts with QuickChart | PNG images, zero client JS, no interactivity | |

**User's choice:** Agent recommended — reuse existing design system, no new charting library
**Notes:** User deferred to agent recommendation. Keeps bundle small for self-hosted deployment.

---

## Visitor Management (FTR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Host approval + timed passes | Pre-registration + email approval + time-window credentials + QR check-in | ✓ |
| All four features | Host approval + timed passes + kiosk mode + badge printing | |
| Timed passes only | Guest credentials that auto-expire | |
| QR-based check-in only | QR credential, guard scans to check in/out | |

**User's choice:** Host approval + timed passes (Recommended)
**Notes:** Balanced scope — covers workflow-heavy features, defers hardware-dependent kiosk/badge printing.

---

## ANPR/LPR (FTR-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-org configurable confidence threshold | Org admin sets min confidence % (default 70%) | ✓ |
| Hardcoded at 80% confidence | Fixed threshold, no admin config | |
| Allowlist/blocklist only — no confidence gating | All plates checked, confidence informational only | |
| Dynamic threshold — AI-determined | Adjusts per-camera based on conditions | |

**User's choice:** Per-org configurable confidence threshold (Recommended)
**Notes:** User deferred to agent recommendation.

---

## Equipment Health (FTR-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Camera + reader health with threshold alerts | Frame drop rate, heartbeat, uptime + reader response, auth failures. Configurable thresholds. | ✓ |
| Cameras only — frame health + connectivity | Camera-only scope | |
| All equipment types | Cameras, readers, doors, controllers, edge servers | |
| Health dashboard only — no predictive alerts | Display metrics, skip proactive alerts | |

**User's choice:** Camera + reader health with threshold alerts (Recommended)
**Notes:** User deferred to agent recommendation. Focused on the two most critical device types.

---

## Dashboard Pages (all modules)

| Option | Description | Selected |
|--------|-------------|----------|
| Enhance existing + add new where missing | Doors/incidents/visitors/ANPR/credentials enhanced. Analytics + equipment new pages. | ✓ |
| Create a unified 'Settings' hub page | All config on one page, operations on existing pages | |
| Enhance existing pages only — no new pages | All modules already have pages, just add config panels | |
| Full page rebuild for all 7 modules | Each module gets redesigned with Phase 6 components | |

**User's choice:** Enhance existing + add new where missing (Recommended)
**Notes:** User deferred to agent recommendation. Reuses existing layouts, adds depth.

---

## Access Control Hardening (FTR-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Error handling + anti-passback hardening | Duplicate detection, anti-passback recovery, zone validation | |
| Full credential lifecycle management | Issuance, temporary passes, revocation, reissuance, expiration notifications | ✓ |
| Dashboard UX improvements only | Loading skeletons, empty states, error banners | |
| Bulk credential operations | CSV import/export, batch assignment, bulk revocation | |

**User's choice:** Full credential lifecycle management
**Notes:** Complete lifecycle — more thorough than targeted hardening.

---

## Mobile Scope (FTR-01, FTR-02, FTR-04)

| Option | Description | Selected |
|--------|-------------|----------|
| API parity only — no new mobile screens | Mobile works with new endpoints, no new UI | |
| Add incident response + door control mobile flows | View assigned incidents, update status, remote door control | ✓ |
| Complete mobile rebuild for all 7 modules | Dedicated screens for every module | |
| Visitor check-in only | Single new screen for visitor QR check-in | |

**User's choice:** Add incident response + door control mobile flows
**Notes:** Guard-operational workflows — not read-only views.

---

## Evidence Auto-Bundling (FTR-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-link related events by time window | ±5 min of incident creation = auto-attach access events, alerts, video | ✓ |
| Auto-link by camera + zone proximity | Evidence sharing same zone/camera as incident source | |
| Manual only — no auto-bundling | Keep evidence manual, add better UI | |
| Full pipeline: time + zone + AI correlation | AI-correlated evidence with confidence scoring | |

**User's choice:** Auto-link related events by time window (Recommended)
**Notes:** User deferred to agent recommendation. Simple heuristic, no ML needed.

---

## Queue Resilience (FTR-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Redis-based job dedup + restart recovery | Dedup SLA timers, stalled job detection, retry + backoff | ✓ |
| Full rebuild with Redis Sorted Sets | Replace BullMQ delayed jobs with Redis sorted sets | |
| Keep current approach — no changes | Existing restart recovery is functional | |
| Add a Dead Letter Queue | Failed escalations to DLQ with admin dashboard | |

**User's choice:** Redis-based job dedup + restart recovery (Recommended)
**Notes:** User deferred to agent recommendation. Edge-case hardening on existing pattern.

---

## Agent Discretion

Per user request, the agent recommended the default option for 7 of 12 areas (marked "Recommended"). Areas where the user made explicit choices: deepening strategy (even spread), access control (full credential lifecycle), mobile scope (incident + door control), visitor management (host approval + timed passes).

Areas left to agent discretion for implementation:
- Exact threshold UI design
- SLA configuration UI in org settings
- PDF closure report template refinements
- Door duplicate event dedup implementation
- Equipment health score algorithm
- ANPR allowlist/blocklist UI
- Visitor host approval email template
- Credential lifecycle dashboard UI
- Mobile incident response / door control UI
- Analytics page component structure
- Evidence auto-bundling query implementation
- Redis job dedup implementation pattern

## Deferred Ideas

| Idea | Reason | Suggested Phase |
|------|--------|-----------------|
| Door schedule-based policies | Enterprise feature, adds zone/schedule coupling | Phase 10 |
| Visitor kiosk mode + badge printing | Hardware-dependent, physical printer integration | Future |
| Predictive equipment degradation alerts (ML) | AI territory, needs historical trend data | Phase 9 |
| AI-based evidence correlation | ML feature, needs embeddings pipeline | Phase 9 |
| Mobile visitor check-in screen | Disproportionate for this phase | Future mobile |
| Mobile ANPR plate lookup | Disproportionate for this phase | Future mobile |
| Mobile equipment health monitor | Disproportionate for this phase | Future mobile |
| BullMQ Dead Letter Queue | Overengineered for v2.0 | Phase 10 |
| Analytics WebSocket push | Polling sufficient, WebSocket reserved for alerts | N/A |
| Full mobile rebuild for 7 modules | 80% coverage with incident + door | Future mobile |
