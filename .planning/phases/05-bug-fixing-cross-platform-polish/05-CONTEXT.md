# Phase 5: Bug Fixing & Cross-Platform Polish - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

All known bugs across API, Dashboard, and Mobile eliminated (POL-01); Dashboard and Mobile deliver feature-parity consistency (POL-02); Mobile achieves crash-free 60fps stability (POL-03); all UI text across apps is fully translated with no gaps (POL-04).

This is a quality pass — fixing bugs and inconsistencies, not adding new capabilities.

Requirements: POL-01, POL-02, POL-03, POL-04 from REQUIREMENTS.md.

</domain>

<decisions>
## Implementation Decisions

### Bug Inventory & Triage (POL-01)
- **D-01:** **Manual screen-by-screen audit** — walk through every Dashboard route (26 sections), then every Mobile screen, with a bug checklist. Do NOT use git log / code grep as primary inventory.
- **D-02:** **Dashboard first, then Mobile** — full Dashboard audit first, fix all issues there. Then audit Mobile against the fixed Dashboard as reference.
- **D-03:** **Fix only — no new tests.** Regression tests are out of scope for this phase. Bug fixes only.

### Cross-Platform Consistency (POL-02)
- **D-04:** **Feature parity** as the consistency bar — same data fields and same user actions between Dashboard and Mobile. Visual styling differences are acceptable.
- **D-05:** **Build a parity matrix** — mapping every Dashboard route to its Mobile counterpart. Flag missing screens. Fix gaps during this phase.
- **D-06:** **French (fr) is the source of truth** — Mobile parity is measured against the French Dashboard experience.

### Mobile Stability & Performance (POL-03)
- **D-07:** **Add Sentry crash reporting** to the Expo app for production crash monitoring.
- **D-08:** **Dual performance bar** — both 60fps smooth navigation AND zero crashes during standard operator workflows (view cameras, respond to alerts, check door status, manage visitors).

### Translation Audit (POL-04)
- **D-09:** **grep + manual review** — grep all Dashboard and Mobile UI files for hardcoded French strings not in i18n files, then manually review every screen for missing/untranslated text.
- **D-10:** **French-first comparison** — all translation gaps are measured against the French locale files. English and other locales should match French coverage.

### Agent's Discretion
- Sentry integration details (@sentry/react-native version, source map upload, performance tracing)
- React Native performance optimization specifics (FlashList, lazy loading, memoization)
- Parity matrix format (spreadsheet, markdown table, etc.)
- Specific bug fix implementation details
- Priority ordering within Dashboard audit (which sections first)
- Translation key naming and i18n file organization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 5 definition, success criteria, POL requirement mapping
- `.planning/REQUIREMENTS.md` — POL-01 through POL-04 requirement descriptions

### Codebase Structure (must-read for audit)
- `.planning/codebase/STRUCTURE.md` — Dashboard route groups (26 sections at `apps/dashboard/app/(dashboard)/`) and Mobile screens (at `apps/mobile/app/`)
- `.planning/codebase/CONVENTIONS.md` — i18n patterns, component styles, file naming
- `.planning/codebase/STACK.md` — Expo SDK version, React Native, dependencies

### Dashboard (Must-audit)
- `apps/dashboard/app/(dashboard)/` — All 26 Dashboard route directories
- `apps/dashboard/lib/api.ts` — Dashboard API client functions
- `apps/dashboard/lib/auth-client.ts` — Auth client with 401 redirect logic
- `apps/dashboard/lib/i18n/` — Dashboard i18n infrastructure

### Mobile (Must-audit)
- `apps/mobile/app/` — All Expo Router screens
- `apps/mobile/app/(tabs)/_layout.tsx` — Tab navigator configuration
- `apps/mobile/lib/api.ts` — Mobile API client
- `apps/mobile/lib/auth-storage.ts` — Mobile token persistence
- `apps/mobile/lib/theme.ts` — Mobile design tokens
- `apps/mobile/components/error-boundary.tsx` — Existing error boundary

### Prior Phase Context
- `.planning/phases/04-marketing-site-redesign/04-CONTEXT.md` — French-first locale decision (D-27), design identity
- `.planning/phases/02-hardware-integration/02-CONTEXT.md` — Hardware event journal, door states for Mobile parity
- `.planning/phases/003-visitor-kiosk/003-CONTEXT.md` — Visitor management screens for parity check
- `.planning/phases/01-infrastructure-foundation/01-CONTEXT.md` — MQTT/door states for parity

No external specs — requirements fully captured in REQUIREMENTS.md and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing i18n infrastructure** — `next-intl` in Dashboard, locale JSON files. Translation audit can reuse key extraction patterns.
- **Dashboard route map** — 26 route directories under `apps/dashboard/app/(dashboard)/` — serves as the source of truth for the parity matrix.
- **Mobile tab navigator** — `apps/mobile/app/(tabs)/_layout.tsx` defines the 10+ tabs/screens to compare against Dashboard.
- **Error boundary** — `apps/mobile/components/error-boundary.tsx` already exists; Sentry wraps at this level.

### Established Patterns
- **French-first content** — All UI text originates in French locale files. Dashboard uses `next-intl`, Mobile uses expo-localization or equivalent.
- **Dashboard routing via App Router** — Each section is a route directory with `page.tsx`. Simple to enumerate for audit.
- **Mobile tab-based navigation** — Main screens are tabs; detail screens are stack pushes. Standard Expo Router pattern.

### Integration Points
- **Sentry** — Add `@sentry/react-native` to Mobile. Initialize in root `_layout.tsx` with DSN from env var. Source maps for stack traces.
- **Performance optimization** — Focus on list screens (cameras, alerts, incidents) where FlashList provides biggest gains.
- **Parity matrix** — Dashboard routes under `app/(dashboard)/` as columns, Mobile screens under `app/` as rows. Document which have counterparts.

### Creative Opportunities
- Sentry setup in this phase means crash trends are tracked from day one of production use.
- Parity matrix can be reused for QA sign-off checklists in future releases.
- The Dashboard-first approach naturally establishes Mobile as the "parity target" for future screen additions.

</code_context>

<specifics>
## Specific Ideas

- **Manual screen-by-screen audit** — walk each Dashboard section, note bugs/inconsistencies, fix before moving to next. Then repeat for Mobile.
- **Feature parity bar** — "Same data, same actions" means: if the Dashboard alerts page shows severity, timestamp, camera name, location, and acknowledge/resolve actions, Mobile must show the same fields and actions even if the layout differs.

</specifics>

<deferred>
## Deferred Ideas

- **Adding tests/coverage** — regression tests and coverage increases are out of scope for Phase 5. Consider for future maintenance phases.
- **Performance benchmarks suite (POL-05)** — Already deferred to v3.1 in REQUIREMENTS.md.
- **CI/CD integration** — Automated test/lint runs in CI would help prevent regressions but are out of scope.

</deferred>

---

*Phase: 5-Bug Fixing & Cross-Platform Polish*
*Context gathered: 2026-07-17*
