# Phase 5: Bug Fixing & Cross-Platform Polish — Research

**Researched:** 2026-07-17
**Domain:** Cross-platform bug fixing, performance optimization, i18n audit, design token reconciliation
**Confidence:** HIGH

## Summary

This phase is a quality pass — fixing bugs, reconciling design tokens, unifying i18n, improving Mobile performance, and eliminating cross-platform inconsistencies. Research confirms the codebase structure and all decisions from CONTEXT.md are well-founded.

**Primary recommendation:** Execute as four parallel workstreams after the initial parity matrix construction: (1) Dashboard bug audit + fix, (2) Mobile bug audit + fix, (3) Mobile performance (Sentry + FlashList + memoization), (4) Design token reconciliation + i18n audit. Dashboard-first per D-02, then Mobile against fixed Dashboard.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | All known bugs across API, Dashboard, and Mobile eliminated | Manual screen-by-screen audit of 28 Dashboard routes + 15+ Mobile screens with checklist |
| POL-02 | Cross-platform consistency — zero visual/functional regressions | Parity matrix (28 Dashboard routes vs Mobile screens) with side-by-side data/action comparison |
| POL-03 | Mobile stability — smooth navigation, no crashes, optimized rendering | Sentry integration, FlashList for list screens, React.memo for cards, removal of console.log |
| POL-04 | Translation gaps resolved across all apps | French-first grep audit of Dashboard vs fr.ts, establish Mobile i18n, verify en.ts coverage matches fr.ts |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Manual screen-by-screen audit — walk every Dashboard route, then every Mobile screen with a bug checklist
- **D-02:** Dashboard first, then Mobile
- **D-03:** Fix only — no new tests
- **D-04:** Feature parity as consistency bar — same data and actions between Dashboard and Mobile
- **D-05:** Build a parity matrix mapping Dashboard routes to Mobile screens
- **D-06:** French (fr) is source of truth
- **D-07:** Add Sentry crash reporting to Mobile
- **D-08:** Dual performance bar — 60fps AND zero crashes
- **D-09:** grep + manual review for translation gaps
- **D-10:** French-first comparison for translation

### Agent's Discretion

- Sentry integration details (@sentry/react-native version, source map upload, performance tracing)
- React Native performance optimization specifics (FlashList, lazy loading, memoization)
- Parity matrix format (spreadsheet, markdown table, etc.)
- Specific bug fix implementation details
- Priority ordering within Dashboard audit (which sections first)
- Translation key naming and i18n file organization

### Deferred Ideas (OUT OF SCOPE)

- Adding tests/coverage
- Performance benchmarks suite (POL-05)
- CI/CD integration
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bug fixing (Dashboard) | Frontend — Dashboard | API | UI bugs, data display, navigation inconsistencies on Dashboard |
| Bug fixing (Mobile) | Frontend — Mobile | API | UI bugs, navigation, data display on Mobile |
| Bug fixing (API) | API | — | Backend issues surfaced during frontend audit |
| Design token reconciliation | Shared — `@repo/design` | Mobile, Dashboard | Mobile `theme.ts` diverged from canonical `@repo/design` — fix at source |
| Performance (Mobile) | Frontend — Mobile | — | Sentry, FlashList, memoization are Mobile-only concerns |
| Performance (Dashboard) | Frontend — Dashboard | — | Mostly fine — no specific performance issues flagged |
| i18n audit (Dashboard) | Frontend — Dashboard | — | Existing i18n system — audit hardcoded strings vs fr.ts |
| i18n audit (Mobile) | Frontend — Mobile | — | No i18n system — must establish patterns |
| Parity matrix | Frontend — both | — | Cross-platform comparison artifact |
| Translation coverage | Frontend — both | — | French-first, en.ts must match fr.ts |

## Standard Stack

No new libraries for Dashboard or API. This phase adds to Mobile:

### Core Additions

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/react-native` | latest stable | Crash reporting + performance monitoring | Industry standard for React Native error tracking, requested per D-07 |
| `@shopify/flash-list` | latest stable | High-performance list rendering | Replaces ScrollView/FlatList for lists >10 items — 60fps scrolling |

### Installation

```bash
pnpm --filter @repo/mobile add @sentry/react-native @shopify/flash-list
```

### Version Verification

Before writing plans, verify latest versions:
```bash
npm view @sentry/react-native version
npm view @shopify/flash-list version
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual i18n | `expo-localization` + `i18n-js` | Manual extraction gives full control; mobile i18n is out of scope for now per D-10 (establish basic pattern only) |
| FlashList | FlatList (existing) | FlatList is fine for <10 items but drops frames on larger lists (cameras, alerts, incidents) |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@sentry/react-native` | npm | 5+ yrs | 500K+/wk | github.com/getsentry/sentry-react-native | [OK] | Approved |
| `@shopify/flash-list` | npm | 3+ yrs | 200K+/wk | github.com/Shopify/flash-list | [OK] | Approved |

**Packages removed:** none
**Packages flagged:** none

## Standard Stack — Existing (already installed, used in phase)

### Dashboard (Next.js 14.2.15)
- `next`, `react` 18.3.1, `tailwindcss` 3, `motion` 12.42.2, `recharts` 2.15.1
- shadcn/ui components: `apps/dashboard/components/ui/` (16 components)
- Custom components: `sidebar`, `header`, `page-header`, `glass-card`, `camera-grid`, etc.
- Icons: `lucide-react` 1.11.0
- Auth: `@/lib/auth-client.ts` (fetchWithAuth with 401 redirect)
- i18n: `apps/dashboard/lib/i18n/context.tsx` + `dictionaries/fr.ts` (811 lines, source of truth) + `en.ts`

### Mobile (Expo SDK 54, React Native 0.81.5)
- `expo-router` 6.0.23, `expo-secure-store`, `expo-av`
- Custom components: 11 in `apps/mobile/components/`
- Icons: `lucide-react-native` 1.16.0
- Design: `@repo/design` dependency exists, BUT most screens use diverged local `@/lib/theme`
- API: `apps/mobile/lib/api.ts` (575 lines, many API functions)
- Constants: `apps/mobile/lib/constants.ts` (severity/status colors, labels)
- Error handling: `ErrorBoundary` class component (no Sentry)

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Bug Audit Flow                            │
│                                                              │
│  ┌─────────────────┐     ┌──────────────────┐               │
│  │  28 Dashboard    │────▶│  Bug Checklist    │               │
│  │  Routes Audit    │     │  (per D-01)       │               │
│  └────────┬────────┘     └────────┬─────────┘               │
│           │                       │                          │
│           ▼                       ▼                          │
│  ┌──────────────────────────────────────────────┐            │
│  │           Fix Dashboard Bugs                  │            │
│  │  (data display, navigation, i18n, actions)    │            │
│  └───────────────────┬──────────────────────────┘            │
│                      │                                       │
│                      ▼                                       │
│  ┌──────────────────────────────────────────────┐            │
│  │   Build Parity Matrix (D-05)                  │            │
│  │  28 Dashboard routes → ~15 Mobile screens     │            │
│  └───────────────────┬──────────────────────────┘            │
│                      │                                       │
│                      ▼                                       │
│  ┌──────────────────────────────────────────────┐            │
│  │  15+ Mobile Screens Audit (against fixed     │            │
│  │  Dashboard as reference, per D-02)            │            │
│  └───┬───────────┬──────────────┬───────────────┘            │
│      │           │              │                             │
│      ▼           ▼              ▼                             │
│  ┌────────┐ ┌──────────┐ ┌──────────────┐                    │
│  │ Bug    │ │ Design   │ │ Performance  │                    │
│  │ Fixes  │ │ Token    │ │ (Sentry +    │                    │
│  │        │ │ Reconcil.│ │ FlashList)   │                    │
│  └────────┘ └──────────┘ └──────────────┘                    │
│                                                              │
│  ┌──────────────────────────────────────────────┐            │
│  │  i18n Audit (D-09, D-10)                     │            │
│  │  Dashboard: grep hardcoded vs fr.ts           │            │
│  │  Mobile: extract hardcoded strings            │            │
│  │  en.ts: verify coverage matches fr.ts         │            │
│  └──────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Parity Matrix Approach (per D-05)

**Format:** Markdown table. Created during planning, used throughout execution.

**Columns:**
1. Dashboard route (French path name)
2. Mobile counterpart screen (path)
3. Parity status: ✅ Exists / ⚠️ Missing / 🔲 Partial
4. Data fields comparison
5. Actions comparison

### Dashboard Bug Audit Checklist (per screen)

1. **Data display** — does the page show correct data from API? Any missing fields?
2. **Empty state** — what renders when data is empty?
3. **Error state** — what renders on API failure? Retry button works?
4. **Loading state** — skeleton/spinner present?
5. **Navigation** — links work, sidebar highlights correct?
6. **Actions** — CRUD operations work end-to-end?
7. **i18n** — all text goes through `t()` function? Any hardcoded French strings?
8. **Console errors** — any React warnings or API errors in console?

### Mobile Bug Audit Checklist (per screen)

1. **Data display** — same fields as Dashboard? Missing fields?
2. **Actions parity** — same actions as Dashboard (acknowledge, resolve, etc.)?
3. **Empty state** — follows UI-SPEC copy (French)?
4. **Error state** — retry mechanism present?
5. **Loading state** — ActivityIndicator or skeleton?
6. **Navigation** — tab/stack navigation works, no jank?
7. **Crash-free** — no unhandled exceptions during the workflow?
8. **Design token usage** — uses `@repo/design` or local `@/lib/theme`?
9. **i18n** — hardcoded strings not yet extracted?

### Design Token Reconciliation Pattern

**Current state:** Mobile screens import from two different sources inconsistently.

Screens using `@/lib/theme` (DIVERGED): `cameras.tsx`, `alerts.tsx`, `incidents.tsx`, `settings.tsx`, `sites.tsx`, `notifications.tsx`, `door-control.tsx`, `qr-checkin.tsx`, `nfc-scan.tsx`

Screens already using `@repo/design`: `(tabs)/_layout.tsx`, `more.tsx`, `guard/_layout.tsx`, `more/chat.tsx`

**Reconciliation action:** Update diverged screens to import from `@repo/design` instead of `@/lib/theme`. Then either remove `@/lib/theme.ts` or reduce it to only Mobile-specific overrides (like touch target sizes: `min-w-[44px]`).

### Sentry Integration Pattern (per D-07)

```typescript
// apps/mobile/app/_layout.tsx — init before any navigation
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0, // can reduce in production
  environment: process.env.EXPO_PUBLIC_ENV || "development",
});

// Wrap root component with Sentry.wrap
export default Sentry.wrap(function RootLayout() { ... });

// In error-boundary.tsx — capture exceptions
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  Sentry.captureException(error, { extra: errorInfo });
}
```

### FlashList Integration Pattern

```typescript
// Before: <ScrollView> or <FlatList>
// After: import FlashList from "@shopify/flash-list";

<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={120} // key for performance
  keyExtractor={(item) => item.id}
  refreshing={refreshing}
  onRefresh={handleRefresh}
/>
```

**Screens to convert** (lists >10 items typical):
- `alerts.tsx` — alert list (paginated, could be large)
- `cameras.tsx` — camera list (paginated)
- `sites.tsx` — site list (typically <20, but paginated)
- `incidents.tsx` — incident list
- `door-control.tsx` — door list

### Anti-Patterns to Avoid

- **Partial import migration:** Don't fix some screens but not others — all Mobile screens should use `@repo/design` consistently.
- **Sentry without source maps:** Without `eas secret:create` for Sentry auth token and `eas build --auto-submit`, source maps won't upload and stack traces will be useless.
- **React.memo on all components:** Only memoize card components used in lists (CameraCard, AlertCard, IncidentCard, DoorControlCard). Over-memoization adds overhead.
- **Converting FlatList for small lists:** Some lists (e.g., the guard tab grid) have <10 items and don't benefit from FlashList. Only convert paginated lists.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Crash reporting | Custom error logging with `console.warn` | `@sentry/react-native` | Breadcrumbs, source maps, session tracking, crash-free rate metrics (D-07) |
| High-performance lists | Custom virtualized list | `@shopify/flash-list` | Shopify-maintained, RecyclerListView under the hood, 60fps guaranteed |
| i18n infrastructure (Mobile) | Full i18n framework | Keep hardcoded French strings for now | Per CONTEXT.md, Mobile i18n is agent's discretion on approach — simplest path is to extract strings to a constants file |
| Confirmation dialogs | Custom Alert | Use built-in `Alert.alert()` on Mobile, shadcn Dialog on Dashboard | Already in use, consistent with platform conventions |

**Key insight:** Sentry and FlashList are mature, well-maintained solutions that solve exactly the problems this phase targets. Custom implementations would be fragile and miss edge cases.

## Runtime State Inventory

> This is NOT a rename/refactor phase. Standard notes:
> - **Stored data:** None — this phase doesn't change data models
> - **Live service config:** None — no service renames
> - **OS-registered state:** None
> - **Secrets/env vars:** Will need `SENTRY_DSN` env var added for Mobile
> - **Build artifacts:** `pnpm-lock.yaml` will update with new dependencies

**Sentry env var to add:**
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry project DSN (configured in Sentry dashboard, added to `apps/mobile/.env` and `eas.json` secrets)
- `SENTRY_AUTH_TOKEN` — for source map uploads (added to `eas.json` build secrets)

## Common Pitfalls

### Pitfall 1: Import Inconsistency on Mobile
**What goes wrong:** Some Mobile screens import from `@/lib/theme` (diverged values) while others import from `@repo/design`. Fixing only some screens leads to visual inconsistency.
**Why it happens:** The mobile app was built before `@repo/design` existed, and screens were never fully migrated.
**How to avoid:** Add a task that migrates ALL `@/lib/theme` imports to `@repo/design` in one pass. Check all 11 component files and all screen files.
**Warning signs:** Grey backgrounds that don't match between tabs (colors.bg = #0a0e17 vs colors.dark.bg = #070912).

### Pitfall 2: Sentry Source Map Upload
**What goes wrong:** Sentry captures errors but stack traces show minified code — impossible to debug.
**Why it happens:** Source map upload requires `sentry-expo` plugin and auth token configured in `eas.json`.
**How to avoid:** Use `sentry-expo` package which handles source map upload during EAS Build automatically.
**Warning signs:** Sentry issues show "Script error" or unreadable stack traces.

### Pitfall 3: FlashList Estimated Item Size
**What goes wrong:** FlashList renders with incorrect item sizes — blank cells, scroll jitter.
**Why it happens:** FlashList needs `estimatedItemSize` to pre-compute layout. Wrong value causes layout thrashing.
**How to avoid:** Set `estimatedItemSize` to the typical card height (~120px for compact cards, ~160px for full cards). Measure from production screens.
**Warning signs:** Items scroll past blank spaces, then snap into position.

### Pitfall 4: Parity Matrix Scope Creep
**What goes wrong:** 20 Dashboard routes with no Mobile counterpart consume too much time building new mobile screens.
**Why it happens:** Per UI-SPEC, 20 of 28 Dashboard routes have ⚠️ Missing status in the parity matrix.
**How to avoid:** Decide per-route: (a) mobile counterpart needed this phase, (b) mobile counterpart deferred, (c) admin-only route doesn't need mobile. Document rationale. This is an agent's discretion area.
**Warning signs:** Tasks expanding to "build new mobile screens" during a bug-fix phase.

### Pitfall 5: i18n Key Drift
**What goes wrong:** Dashboard `fr.ts` has keys that don't match English `en.ts`, or hardcoded strings exist in components that aren't in either.
**Why it happens:** New features added strings to components without updating the dictionary.
**How to avoid:** Use `grep -r "t("` to find all used keys, cross-reference against fr.ts keys, add missing ones. Then compare fr.ts keys against en.ts keys.
**Warning signs:** UI shows "nav.someKey" instead of "Some text" — the fallback is returning the raw key.

## Code Examples

### Sentry Initialization in Mobile Root Layout

```typescript
// apps/mobile/app/_layout.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: __DEV__ ? "development" : "production",
  enableNative: true,
});

// Wrap the entire app
export default Sentry.wrap(function RootLayout() {
  // ...existing code...
});
```

### Sentry in ErrorBoundary

```typescript
// apps/mobile/components/error-boundary.tsx
import * as Sentry from "@sentry/react-native";

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  Sentry.captureException(error, {
    extra: {
      componentStack: errorInfo.componentStack,
    },
  });
}
```

### FlashList Usage Pattern

```typescript
// Before (existing pattern):
{items.map((item) => <AlertCard key={item.id} alert={item} />)}

// After:
import FlashList from "@shopify/flash-list";

<FlashList
  data={items}
  renderItem={({ item }) => <AlertCard alert={item} />}
  estimatedItemSize={120}
  keyExtractor={(item) => item.id}
  contentContainerStyle={styles.list}
  ItemSeparatorComponent={() => <View style={styles.separator} />}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={refreshItems} tintColor={colors.shared.primary} />
  }
/>
```

### React.memo Pattern for Card Components

```typescript
// apps/mobile/components/alert-card.tsx
import { memo } from "react";

export const AlertCard = memo(function AlertCard({ alert }: { alert: AlertItem }) {
  return (
    <TouchableOpacity style={styles.card}>
      {/* existing card UI */}
    </TouchableOpacity>
  );
});
```

### Design Token Import Migration

```typescript
// Before (diverged):
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

// After (canonical):
import { colors, typography, spacing } from "@repo/design";
```

**Note:** Mobile uses `borderRadius` which is NOT in `@repo/design/src/`. The canonical design only defines shadows and visual primitives. Mobile-specific spacing/border-radius values in `@/lib/theme.ts` should be validated: `borderRadius.sm: 6, md: 10, lg: 14, xl: 20` — these are mobile-specific and acceptable as local overrides.

### French Translation Hardcoded String Pattern to Extract

```typescript
// Found in alerts.tsx — currently hardcoded:
"Chargement des alertes..."
// Should be extracted to t('alerts.loading') if it goes through i18n

// Found in guards/index.tsx — hardcoded:
"Voir les alertes"
"Caméras actives"
"État des portes"
"Signalement"

// These should be moved to a shared dictionary or kept as-is if mobile doesn't use i18n
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mobile local theme (`apps/mobile/lib/theme.ts`) | `@repo/design` package (canonical) | Phase 5 adds `@repo/design` to existing project | All Mobile screens should migrate imports |
| No crash reporting | `@sentry/react-native` | Phase 5 | Crash trends tracked from day one |
| FlatList/ScrollView lists | `@shopify/flash-list` | Phase 5 | 60fps scrolling on large lists |
| Manual console.warn logging | Sentry breadcrumbs + exception capture | Phase 5 | Structured error tracking |

**Deprecated/outdated:**
- `apps/mobile/lib/theme.ts`: Keep only mobile-specific values (borderRadius), remove everything covered by `@repo/design`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All Dashboard routes are under `apps/dashboard/app/(dashboard)/` and each has a `page.tsx` | Codebase Structure | Some routes might be missing or use different file patterns — verify with actual `ls` during planning |
| A2 | Mobile screens that import from `@/lib/theme` must be migrated to `@repo/design` | Design Token Reconciliation | Some screens might rely on specific local values not in `@repo/design` (borderRadius) — validate during execution |
| A3 | `@sentry/react-native` latest stable version works with Expo SDK 54 | Sentry Integration | Need to verify compatibility before lock — check Sentry Expo docs for SDK 54 support |
| A4 | `@shopify/flash-list` latest stable version works with React Native 0.81.5 | FlashList | Need to verify version compatibility |
| A5 | The Dashboard `fr.ts` dictionary has 811 lines and is the source of truth for all French UI text | i18n Audit | Some strings in Dashboard components may not be in the dictionary — that's exactly what the audit will find |
| A6 | Mobile has no existing i18n infrastructure | Mobile i18n | Confirmed by reading all Mobile screen files — all strings are hardcoded French |

## Open Questions (RESOLVED)

1. **Which Dashboard routes need Mobile parity this phase?**
   - What we know: 28 Dashboard routes, only ~8 have Mobile counterparts
   - What's unclear: Which of the 20 ⚠️ Missing routes should have Mobile screens added during a bug-fix phase?
   - Recommendation: During planning, flag each as (a) urgent parity needed, (b) defer to future, (c) admin-only/irrelevant for mobile. Most likely only a few (e.g., analytics) need parity.

2. **Should Mobile get a real i18n system or keep hardcoded French?**
   - What we know: D-09 says grep+manual review for translation gaps. D-10 says French-first comparison.
   - What's unclear: "Establish Mobile i18n" could mean installing an i18n library or just extracting to a constants file.
   - Recommendation: Extract hardcoded strings to a shared dictionary in `apps/mobile/lib/i18n.ts` for now. A full i18n framework is over-engineering for a predominantly French app.

3. **What Sentry DSN should be used?**
   - What we know: No existing Sentry config
   - What's unclear: UI-SPEC specifies environment variable but not the actual DSN value
   - Recommendation: Require user to provide Sentry DSN before planning (add to `.env`). Document setup instructions.

## Environment Availability

> This phase primarily involves code changes. External dependencies are minimal.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pnpm install | ✓ | >=18 | — |
| pnpm | Package installs | ✓ | 9.0.0 | — |
| Docker (PostgreSQL + Redis) | API testing | ✓ | — | — |
| Sentry account | Crash reporting | ❌ Not configured | — | User must create Sentry project + get DSN |

**Missing dependencies with no fallback:**
- **Sentry project + DSN:** Needed for `@sentry/react-native` initialization. User must create a Sentry.io project and provide the DSN. This blocks Sentry integration but does NOT block other workstreams.

**Missing dependencies with fallback:**
- None — all other dependencies are code-based and available.

## Validation Architecture

Skipped — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

## Security Domain

Skipped — this is a bug-fixing and polish phase with no new security-sensitive capabilities. The Sentry integration follows standard crash-reporting best practices (DSN is a public key, not a secret). No new authentication, authorization, encryption, or input validation changes.

## Sources

### Primary (HIGH confidence)
- Codebase files read directly: Dashboard routes, Mobile screens, design tokens, i18n dictionaries, API clients
- UI-SPEC.md (Phase 5 UI Design Contract)
- CONTEXT.md (Phase 5 user decisions)
- `packages/design/src/` — canonical design token definitions
- `apps/mobile/lib/theme.ts` — diverged theme confirmed
- `apps/mobile/package.json` — existing dependencies confirmed (no Sentry, no FlashList)

### Secondary (MEDIUM confidence)
- `@sentry/react-native` official docs — [ASSUMED] compatibility with Expo SDK 54 (Sentry Expo docs confirm SDK 49+ support)
- `@shopify/flash-list` official docs — [ASSUMED] compatibility with React Native 0.81.5 (supports RN 0.71+)

### Tertiary (LOW confidence)
- None — all codebase findings are verified by direct file reads.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing packages verified via codebase read, new packages are well-known industry standards
- Architecture: HIGH — patterns verified against actual codebase files
- Pitfalls: HIGH — based on actual codebase divergences detected during research
- Parity matrix: HIGH — 28 Dashboard routes counted directly, ~15 Mobile screens examined directly

**Research date:** 2026-07-17
**Valid until:** 2026-08-17 (stable — all findings are codebase-verified, not time-sensitive)
