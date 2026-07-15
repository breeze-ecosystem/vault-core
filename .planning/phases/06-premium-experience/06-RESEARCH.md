# Phase 6: Premium Experience - Research

**Researched:** 2026-07-15
**Domain:** Premium UI/UX design system, animation, dark/light mode, mobile guard-first redesign
**Confidence:** HIGH

## Summary

Phase 6 delivers a complete premium experience upgrade across Dashboard and Mobile — the single largest visual transformation in the v2.0 roadmap. It covers seven requirements (UIX-01 through UIX-07): adopting Radix Themes alongside namespace-migrated shadcn/ui, building a shared design token package (`@repo/design`), implementing fluid animations via `motion` (the framer-motion successor), full premium redesigns of the three highest-traffic pages (Overview, Cameras, Alerts), global design uplift for all existing pages via CSS variable replacement, dark/light mode toggle with system preference detection, and a mobile guard-first redesign with 4-tab navigation and offline-capable quick actions.

**Primary recommendation:** Use `next-themes` for dark/light mode class switching (Radix Themes officially recommends this integration). Import `motion` from `"motion/react"` for components, `"motion/react-client"` for server components. Prefix existing shadcn/ui CSS vars with `--shadcn-`. Create a new `@repo/design` workspace package for shared JS constants consumed by mobile.

### Key Technical Challenges

1. **Radix Themes + shadcn/ui coexistence** — CSS variable namespace migration and Radix Themes' closed component system vs shadcn/ui customization patterns
2. **Next.js import order issue with Radix Themes** — Radix Themes CSS must be imported before `globals.css` in layout; use `postcss-import` workaround or merge strategy per Radix docs
3. **`motion` in Next.js App Router** — Requires `"use client"` directive or `"motion/react-client"` import pattern; `AnimatePresence` needs careful positioning in the component tree
4. **Mobile offline queue** — `expo-secure-store` already used for auth tokens (5KB limit per item); larger payloads (photos) need file system storage with `expo-file-system`
5. **Shared token package for mobile** — Must export plain JS constants (no CSS), since mobile uses `StyleSheet.create()` not Tailwind

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Adopt Radix Themes alongside existing shadcn/ui + Tailwind CSS. Resolve CSS variable conflicts via namespace migration.
- **D-02:** Prefix existing shadcn/ui CSS vars (e.g., `--shadcn-background`) to avoid collision with Radix Themes vars. Map Radix Themes CSS vars to Tailwind utility classes.
- **D-03:** All design tokens (colors, typography, spacing, shadows) defined as CSS custom properties in `globals.css` using HSL values. Tailwind `extend` references these CSS vars for runtime-switchable dark/light theming.
- **D-04:** Mobile shares design tokens (colors, typography scale) as JS constants exported from a shared package (`@repo/design`). Dashboard uses CSS vars, Mobile imports JS constants. A component spec document ensures visual parity across platforms (no NativeWind).
- **D-05:** Use `motion` (successor to framer-motion, ~15KB gzipped) for animations. Install as a new dependency — currently not present.
- **D-06:** Two-layer animation strategy: (a) `AnimatePresence` for page/route transitions at the dashboard layout level, (b) component-level micro-interactions — staggered list reveals, hover state animations, card entrance effects, notification slide-ins.
- **D-07:** Overview page — full layout rearchitecture: live metrics hero section, data visualization (sparkline trends, donut charts for alert severity), quick-action toolbar, real-time activity timeline. Custom layout, not reusing existing stats-card pattern.
- **D-08:** Cameras page — live grid + map/floorplan split view: responsive camera thumbnail grid with status overlays (online/offline/recording), quick-play hover preview, floorplan/map showing camera positions, always-visible filter/search bar.
- **D-09:** Alerts page — real-time feed + triage side panel: live-scrolling alert feed with severity color bars, inline video thumbnail for camera-linked alerts, detail/action side panel, bulk acknowledge/resolve toolbar.
- **D-10:** 4-tab simplified navigation: Dashboard (overview + quick actions), Cameras (live grid), Incidents (capture + triage), More (settings + chat + sites). Bigger touch targets, guard-optimized labels.
- **D-11:** Quick-action shortcuts on home screen — primary row: Check In (location+timer), Report Incident (photo+capture), Control Door (open/close). Secondary row: View Alerts, Find Camera.
- **D-12:** Offline mode: check-in/out works offline (queued sync). Cached camera list and recent alerts available offline. Incident capture stores photo + notes locally, syncs on reconnect.

### The Agent's Discretion
- Dark/light mode toggle implementation (toggle switch placement, system preference detection via `prefers-color-scheme`, theme persistence strategy).
- UIX-06 global uplift for all existing pages (consistent typography scale, spacing rhythm, color tokens, component styles) — clear requirement, implement using the new design system tokens without rewriting page logic.
- CSS namespace migration approach (exact prefix naming convention, migration ordering — which files to update first, Radix Themes installation and provider setup).
- Radix Themes component selection (which Radix components to use vs which to keep as shadcn/ui).
- Overview/Cameras/Alerts page component structure and data fetching setup.
- Mobile quick-action button component design and animation.
- Shared design token package structure (`@repo/design` or under `packages/shared`).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 6 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UIX-01 | Design system built with Radix Themes + Tailwind CSS, shared across Dashboard and Mobile | Verified coexistence strategy: namespace migration (`--shadcn-` prefix), `@radix-ui/themes` v3.3.0 with `next-themes` integration. Mobile shares via `@repo/design` JS constants. |
| UIX-02 | Premium 2026 visual design — dark-first, glassmorphism accents, fluid animations | Existing `.glass` utility in `globals.css` provides base. Enhanced glass utilities (`glass-premium`, `glass-accent`) defined. Dark theme HSL values verified in current codebase. |
| UIX-03 | Dashboard uses `motion` for page transitions, micro-interactions, and scroll reveals | `motion` v12.42.2 confirmed on npm, import from `"motion/react"`, ~15KB gzipped. `AnimatePresence` API confirmed. SSR compat: use `"use client"` or `"motion/react-client"`. |
| UIX-04 | Mobile premium guard-first design — simplified navigation, quick actions, offline mode | 4-tab design specified (Accueil, Caméras, Incidents, Plus). Offline queuing via `expo-secure-store` (small) + file system (photos). Current 6-tab layout in `apps/mobile/app/(tabs)/_layout.tsx`. |
| UIX-05 | Dark/light mode toggle with system preference detection | `next-themes` v0.4.6 recommended by Radix Themes docs. `attribute="class"` mode. System detection via `prefers-color-scheme`. localStorage persistence. |
| UIX-06 | All existing Dashboard pages get the new design system applied (not rewritten — system upgrade) | CSS variable replacement at the `:root` level applies globally to all Tailwind utility classes. No page logic changes needed. |
| UIX-07 | Top 3 highest-traffic pages get full premium redesign | Full layout specs in UI-SPEC.md: Overview (metrics hero + timeline + donut + camera grid), Cameras (grid/map toggle + filter), Alerts (feed + side panel + bulk actions). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design system tokens (CSS vars) | Dashboard (Next.js) | Shared (`@repo/design`) | CSS vars defined in `globals.css` for Tailwind consumption; mobile imports JS equivalents |
| Page transitions (AnimatePresence) | Dashboard (Next.js) | — | `motion` runs client-side in dashboard layout wrapper |
| Component micro-interactions | Dashboard (Next.js) | — | `motion.div` components interact at the component level |
| Dark/light mode state | Dashboard (Next.js) | — | `next-themes` manages class on `<html>`, persisted to localStorage |
| System preference detection | Browser (client) | — | `matchMedia('prefers-color-scheme: dark')` — no server involvement |
| Mobile tab navigation | Mobile (Expo) | — | Expo Router `Tabs` navigator with 4 screens |
| Mobile offline queue | Mobile (Expo) | — | Local storage (SecureStore + file system), queued sync on reconnect |
| Camera grid + map view | Dashboard (Next.js) | — | Client-side rendering with `layoutId` animation toggle |
| Alert side panel | Dashboard (Next.js) | — | Client-side state manages open/close with slide animation |
| Recharts visualizations | Dashboard (Next.js) | — | `recharts` already installed — use for donut charts |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/themes` | ^3.3.0 | Pre-styled design system component library | Decision D-01. Radix Themes provides theme-aware components (Dialog, Select, Table) that auto-switch on appearance |
| `motion` | ^12.42.2 | Animation library (successor to framer-motion) | Decision D-05. ~15KB gzipped. Import from `"motion/react"` |
| `next-themes` | ^0.4.6 | Dark/light mode state management | Officially recommended by Radix Themes for SSR-safe class switching |
| `@repo/design` | workspace:* | Shared design token package (new) | Decision D-04. Exports JS constants consumed by mobile |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `recharts` | 2.15.1 | SVG chart library | Already installed at dashboard package.json. Use for donut chart and sparklines |
| `lucide-react` / `lucide-react-native` | ^1.11.0 / ^1.16.0 | Icon libraries | Already installed. All new components use existing lucide icons |
| `expo-secure-store` | ~15.0.8 | Secure local storage for small payloads | Already installed in mobile. Use for check-in state, cached camera list, cached alerts (text-only) |
| `expo-file-system` | (needs install) | File system access for photo storage | Needed for offline incident capture photo storage (beyond SecureStore's 5KB limit) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next-themes` | Custom React context | `next-themes` eliminates flash-of-wrong-theme on SSR, matches Radix's recommendation exactly |
| `motion` | CSS-only animations | CSS can't do spring physics, interruptible keyframes, or staggered `AnimatePresence` exits |
| `@radix-ui/themes` | Stay with pure shadcn/ui | Would need to hand-build theme-aware components for Dialog, Select, Table — significant duplication |

**Installation:**
```bash
pnpm add motion @radix-ui/themes next-themes --filter @repo/dashboard
pnpm add expo-file-system --filter @repo/mobile
```

**Version verification:**
```bash
npm view motion version           # 12.42.2 [VERIFIED]
npm view @radix-ui/themes version # 3.3.0 [VERIFIED]
npm view next-themes version      # 0.4.6 [VERIFIED]
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Postinstall | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|-------------|
| `motion` | npm | 5+ yrs (previously framer-motion) | 12.2M/wk | github.com/motiondivision/motion | [OK] | none | Approved |
| `@radix-ui/themes` | npm | 3+ yrs | ~500K/wk | github.com/radix-ui/themes | [OK] | none | Approved |
| `next-themes` | npm | 4+ yrs | 24M/wk | github.com/pacocoursey/next-themes | [OK] | none | Approved |
| `expo-file-system` | npm (Expo SDK) | 5+ yrs | (bundled with Expo) | github.com/expo/expo | [OK] | none | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Dashboard)                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Root Layout (layout.tsx)                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ next-themes  │  │    Radix     │  │   I18nProvider  │  │  │
│  │  │ ThemeProvider│→│Theme wrapper │→│   (existing)    │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Dashboard Layout (dashboard-layout.tsx)          │  │
│  │  ┌─────────┐  ┌────────────────────────────────────────┐  │  │
│  │  │ Sidebar │  │           Main Content Area             │  │  │
│  │  │┌───────┐│  │  ┌──────────────────────────────────┐  │  │  │
│  │  ││Theme  ││  │  │   AnimatePresence (page wrapper)  │  │  │  │
│  │  ││Toggle ││  │  │  ┌──────────────────────────────┐│  │  │  │
│  │  │└───────┘│  │  │  │  Page Content with motion    ││  │  │  │
│  │  └─────────┘  │  │  │  (staggered, micro-int.)     ││  │  │  │
│  │               │  │  └──────────────────────────────┘│  │  │  │
│  │               │  └──────────────────────────────────┘  │  │  │
│  │               └────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              globals.css (CSS Variable Layer)               │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ :root / .dark (HSL)  │  │ [data-theme="light"]     │   │  │
│  │  │ --shadcn-background  │  │ --shadcn-background: white│   │  │
│  │  │ --shadcn-foreground  │  │ --shadcn-foreground: bk  │   │  │
│  │  │ ...                  │  │ ...                      │   │  │
│  │  └──────────────────────┘  └──────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                           │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Tab Layout (4-tab navigation)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Accueil  │ │ Caméras  │ │Incidents │ │  Plus    │    │  │
│  │  │ (quick   │ │ (live    │ │ (capture │ │(settings,│    │  │
│  │  │ actions) │ │ grid)    │ │ + triage)│ │ chat, etc│    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           StyleSheet.create() + theme imports               │  │
│  │  colors from @repo/design  │  typography from @repo/design │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (new files)
```
apps/dashboard/
├── lib/
│   └── theme-provider.tsx      # Client component wrapping next-themes + Radix Theme
├── components/
│   ├── page-transition.tsx     # AnimatePresence wrapper for page-level transitions
│   ├── glass-card.tsx          # Enhanced glassmorphism card component
│   ├── metric-hero.tsx         # Large stat display with sparkline + trend
│   ├── donut-chart.tsx         # Recharts-based donut chart for severity distribution
│   ├── sparkline.tsx           # Inline SVG mini-chart for metric trends
│   ├── quick-action-bar.tsx    # Floating toolbar with primary actions
│   ├── activity-timeline.tsx   # Real-time scrollable timeline with severity bars
│   ├── camera-grid.tsx         # Responsive camera thumbnail grid
│   ├── camera-card-premium.tsx # Enhanced camera card with hover-preview
│   ├── alert-feed.tsx          # Real-time scrolling alert list
│   ├── alert-row.tsx           # Individual alert item in feed
│   ├── alert-side-panel.tsx    # Detail/action side panel for selected alert
│   ├── bulk-action-bar.tsx     # Floating toolbar for batch actions
│   └── theme-toggle.tsx        # Dark/light mode toggle button with dropdown

apps/mobile/
├── app/(tabs)/
│   ├── _layout.tsx             # Rewrite to 4-tab layout
│   ├── index.tsx               # Rewrite with quick actions
│   ├── incidents.tsx           # New incident capture tab (placeholder)
│   └── more.tsx                # New overflow menu screen
├── components/
│   └── quick-action-button.tsx  # 64×64px guard-first action tile

packages/
└── design/
    ├── package.json            # @repo/design workspace package
    ├── tsconfig.json
    └── src/
        ├── index.ts            # Barrel export
        ├── colors.ts           # Token values (dark + light variants)
        ├── typography.ts       # Font sizes, weights, line heights
        ├── spacing.ts          # Spacing scale
        └── shadows.ts          # Premium shadow definitions
```

### Pattern 1: CSS Variable Namespace Migration
**What:** Prefix all existing shadcn/ui CSS custom properties with `--shadcn-` to avoid collision with Radix Themes' own CSS variables. Then re-map them in `tailwind.config.ts` extended colors.
**When to use:** Always — this is the foundational pattern for Phase 6. All shadcn/ui components, page components, and Tailwind utilities consume CSS vars via `hsl(var(--shadcn-xxx))`.
**Example (globals.css):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "@radix-ui/themes/styles.css"; /* Radix themes first per Next.js import order fix */

@layer base {
  :root, .dark {
    --shadcn-background: 228 20% 4%;
    --shadcn-foreground: 210 20% 98%;
    --shadcn-card: 228 24% 6%;
    --shadcn-primary: 190 90% 50%;
    /* ... all 17 vars prefixed with --shadcn- ... */
    --shadcn-ring: 190 90% 50%;
    --shadcn-radius: 0.625rem;
  }

  [data-theme="light"] {
    --shadcn-background: 0 0% 100%;
    --shadcn-foreground: 228 20% 4%;
    --shadcn-card: 0 0% 100%;
    /* ... light mode overrides ... */
  }
}
```
**Example (tailwind.config.ts):**
```typescript
colors: {
  background: "hsl(var(--shadcn-background))",
  foreground: "hsl(var(--shadcn-foreground))",
  primary: {
    DEFAULT: "hsl(var(--shadcn-primary))",
    foreground: "hsl(var(--shadcn-primary-foreground))",
  },
  // ... all other colors remapped
}
```

### Pattern 2: Theme Provider with next-themes + Radix Themes
**What:** Layer `next-themes` `ThemeProvider` (manages `class` on `<html>`) and Radix Themes `Theme` wrapper. Radix Themes components automatically respond to `className="dark"` on `<html>`.
**When to use:** Root layout only. All pages inherit the theme context.
**Example:**
```typescript
// apps/dashboard/lib/theme-provider.tsx
"use client";

import { Theme } from "@radix-ui/themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <Theme accentColor="cyan" grayColor="slate" radius="medium">
        {children}
      </Theme>
    </NextThemesProvider>
  );
}
```
```typescript
// apps/dashboard/app/layout.tsx (server component — wraps children)
```
Note: `next-themes` `ThemeProvider` must be inside `<body>`. The `suppressHydrationWarning` prop must be on `<html>`. Radix Themes `<Theme>` wraps just the `<body>` content.

### Pattern 3: Page Transitions with AnimatePresence
**What:** `AnimatePresence` wrapping the page content in the dashboard layout, with `motion.div` page transitions.
**When to use:** Applied once in `dashboard-layout.tsx` or via a dedicated `PageTransition` component.
**Example:**
```typescript
"use client";

import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### Pattern 4: Staggered Grid Entrance (Micro-Interaction)
**What:** `motion` variants with `staggerChildren` for grid card entrance animations.
**When to use:** CameraGrid cards, MetricHero grid, AlertFeed rows — anywhere multiple items enter simultaneously.
**Example:**
```typescript
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// In component:
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      <Card>...</Card>
    </motion.div>
  ))}
</motion.div>
```

### Anti-Patterns to Avoid
- **CSS `@import` ordering for Radix Themes:** Don't rely on import ordering in `layout.tsx` — Next.js 13.0-14.1 has a known CSS import order bug. Use `postcss-import` to merge CSS, or import Radix Themes CSS via `@import` at the top of `globals.css` before custom styles. [CITED: radix-ui.com/themes/docs/overview/styling]
- **Multiple `@tailwind base` directive:** Don't keep `@tailwind base` if Radix Themes buttons lose background color. Tailwind's button reset can interfere with Radix Themes styled buttons. Use `@tailwind` in a `@layer` or remove Radix Themes base reset conflict. [CITED: radix-ui.com/themes/docs/overview/styling]
- **`motion` in server components without `"use client"`:** Motion components like `motion.div` and `AnimatePresence` are client-only. Always use `"use client"` directive or import from `"motion/react-client"`. [CITED: motion.dev/docs/react-installation]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark/light mode switching | Custom React context + localStorage + system preference listener | `next-themes` | Handles SSR hydration (flash prevention), system preference detection, tab sync, CSP nonce, all edge cases. Radix Themes officially recommends it. |
| Animation engine | CSS transitions for enter/exit | `motion` with `AnimatePresence` | CSS `@keyframes` can't do spring physics, interruptible animations, stagger children, or layout animations. Motion is ~15KB gzipped. |
| Data visualization chart | Building SVG donut charts from scratch | `recharts` (already installed) | Accessibility (ARIA labels), responsiveness, animations, tooltips. Already in deps. |
| Theme-aware components | Building styled Dialog/Select/Table that respond to dark/light mode | `@radix-ui/themes` components | Radix Themes components auto-switch appearance based on `className="dark"`. Building equivalent in shadcn/ui requires manual theme wiring. |
| Share design tokens between apps | Copy/pasting color values between Dashboard CSS and Mobile theme.ts | `@repo/design` workspace package | Single source of truth. TypeScript types ensure consistency. pnpm workspace resolution is zero-config. |

**Key insight:** The three most deceptively complex problems in a 2026 SaaS UI are (1) SSR-safe theme switching without flash, (2) production-grade exit animations, and (3) cross-platform design token sharing. Existing battle-tested libraries exist for all three — custom solutions would reproduce years of edge case handling.

## Common Pitfalls

### Pitfall 1: Radix Themes CSS Import Order
**What goes wrong:** Radix Themes styles override custom styles (or vice versa) in unpredictable ways because Next.js doesn't guarantee CSS import order in `app/**/layout.tsx`.
**Why it happens:** Next.js 13.0-14.1 CSS import ordering bug. Imports in layout.tsx may be reordered at build time.
**How to avoid:** Import Radix Themes CSS via `@import` at the top of `globals.css` before Tailwind directives, OR use `postcss-import` to control ordering. Alternatively, import the split CSS files (`tokens.css`, `components.css`, `utilities.css`) in the correct order. [CITED: radix-ui.com/themes/docs/overview/styling]
**Warning signs:** Buttons appearing without background, custom CSS vars not applying to Radix components.

### Pitfall 2: Tailwind @tailwind base Button Reset Conflicts
**What goes wrong:** Radix Themes buttons lose their background color because Tailwind's base CSS button reset has higher specificity.
**Why it happens:** Tailwind's `@tailwind base` includes a button reset that targets `button` elements. Radix Themes buttons are styled via class selectors, but Tailwind's reset can interfere with the background `color` property.
**How to avoid:** Remove `@tailwind base` and selectively import base styles, OR move Tailwind base to a CSS `@layer` and ensure Radix Themes styles come after in the cascade. [CITED: radix-ui.com/themes/docs/overview/styling]
**Warning signs:** Radix `<Button>` renders without background color.

### Pitfall 3: motion AnimatePresence Position in Component Tree
**What goes wrong:** Exit animations don't fire because `AnimatePresence` itself is unmounted along with the children.
**Why it happens:** If the conditional rendering wraps `AnimatePresence` instead of being inside it, React unmounts `AnimatePresence` before it can run exit animations.
**How to avoid:** Always place the conditional rendering *inside* `AnimatePresence`, not outside: `<AnimatePresence>{isVisible && <Component />}</AnimatePresence>`. [CITED: motion.dev/docs/react-animate-presence]
**Warning signs:** Exit animations silently don't play — component disappears instantly.

### Pitfall 4: Mobile SecureStore 5KB Limit for Offline Cache
**What goes wrong:** Storing camera lists or alert caches in `expo-secure-store` fails silently when payload exceeds ~5KB per item.
**Why it happens:** SecureStore is designed for short strings (tokens, IDs). Camera lists with many entries easily exceed 5KB.
**How to avoid:** Use SecureStore only for small state (check-in timer value, last refresh timestamp). Use `AsyncStorage` (from `@react-native-async-storage/async-storage`) for larger caches (camera list, alerts list). Use `expo-file-system` for photo storage. [CITED: docs.expo.dev/versions/latest/sdk/securestore — size limits]
**Warning signs:** `SecureStore.setItemAsync` resolves but `getItemAsync` returns null or truncated data.

### Pitfall 5: Theme Flash on SSR (next-themes Handles This)
**What goes wrong:** Without `next-themes`, the page renders in default theme first, then flashes to the correct theme after JavaScript hydration.
**Why it happens:** Server-rendered HTML has no access to `localStorage` or `prefers-color-scheme`.
**How to avoid:** Use `next-themes` — it injects an inline `<script>` before the page renders to set the correct `class` on `<html>`. Also ensure `suppressHydrationWarning` is on `<html>` element. [CITED: github.com/pacocoursey/next-themes]
**Warning signs:** Brief white flash on page load when dark mode is active.

## Code Examples

Verified patterns from official sources:

### Theme Provider Setup (Dashboard Root Layout)
```typescript
// apps/dashboard/lib/theme-provider.tsx
// Source: [CITED: radix-ui.com/themes/docs/theme/dark-mode] + [CITED: github.com/pacocoursey/next-themes]
"use client";

import { Theme } from "@radix-ui/themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import "@radix-ui/themes/styles.css";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <Theme accentColor="cyan" grayColor="slate" radius="medium">
        {children}
      </Theme>
    </NextThemesProvider>
  );
}
```

```typescript
// apps/dashboard/app/layout.tsx
// Source: [CITED: radix-ui.com/themes/docs/overview/getting-started]
import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### motion AnimatePresence Page Transition
```typescript
// apps/dashboard/components/page-transition.tsx
// Source: [CITED: motion.dev/docs/react-animate-presence]
"use client";

import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### Theme Toggle Component (Dark/Light/System)
```typescript
// apps/dashboard/components/theme-toggle.tsx
// Source: [CITED: github.com/pacocoursey/next-themes]
"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
        <Sun className="h-4 w-4" />
        <span className="sr-only">Thème</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
          <span className="sr-only">Thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Clair</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Sombre</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>Automatique</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Shared Design Token Package (Mobile-Safe Exports)
```typescript
// packages/design/src/colors.ts
// Source: [CITED: UI-SPEC.md] — values from design contract
export const colors = {
  dark: {
    bg: "#070912",
    surface: "#0c1020",
    elevated: "#1a2332",
    border: "#1e293b",
    // ... all tokens from UI-SPEC.md
  },
  light: {
    bg: "#ffffff",
    surface: "#f5f7fa",
    elevated: "#ffffff",
    border: "#e2e8f0",
    // ... light mode tokens
  },
  shared: {
    primary: "#06b6d4",
    success: "#10b981",
    warning: "#f59e0b",
    destructive: "#ef4444",
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorPalette = typeof colors;
```

```typescript
// packages/design/src/typography.ts
// Source: [CITED: UI-SPEC.md]
export const typography = {
  display: { fontSize: 28, fontWeight: 600 as const, lineHeight: 1.2 },
  heading: { fontSize: 20, fontWeight: 600 as const, lineHeight: 1.2 },
  body: { fontSize: 14, fontWeight: 400 as const, lineHeight: 1.5 },
  label: { fontSize: 12, fontWeight: 600 as const, lineHeight: 1.2 },
  mono: { fontSize: 24, fontWeight: 600 as const, fontVariant: ["tabular-nums" as const] },
  monoSmall: { fontSize: 14, fontWeight: 600 as const, fontVariant: ["tabular-nums" as const] },
} as const;
```

```typescript
// packages/design/src/index.ts
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./shadows";
```

```json
// packages/design/package.json
{
  "name": "@repo/design",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "5.9.2"
  }
}
```

### Glass Card Component (Premium)
```typescript
// apps/dashboard/components/glass-card.tsx
// Source: [CITED: globals.css existing glass utility + UI-SPEC.md]
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accent";
}

export function GlassCard({ className, variant = "default", children, ...props }: GlassCardProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={cn(
        "rounded-xl border backdrop-blur-sm transition-all duration-200",
        variant === "default" &&
          "bg-card/60 border-border/40 shadow-[0_8px_32px_hsl(var(--primary)/0.04)]",
        variant === "accent" &&
          "bg-primary/[0.04] border-primary/[0.12] shadow-[0_8px_32px_hsl(var(--primary)/0.06)]",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

### Mobile 4-Tab Tab Layout
```typescript
// apps/mobile/app/(tabs)/_layout.tsx
// Source: [CITED: UI-SPEC.md D-10]
import { Tabs } from "expo-router";
import { LayoutDashboard, Camera, AlertTriangle, MoreHorizontal } from "lucide-react-native";
import { colors, typography } from "@/lib/theme";
// Note: Phase 6 should import from @repo/design instead of @/lib/theme

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ focused }) => (
            <LayoutDashboard size={22} color={focused ? colors.primary : colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          title: "Caméras",
          tabBarIcon: ({ focused }) => (
            <Camera size={22} color={focused ? colors.primary : colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="incidents"
        options={{
          title: "Incidents",
          tabBarIcon: ({ focused }) => (
            <AlertTriangle size={22} color={focused ? colors.primary : colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Plus",
          tabBarIcon: ({ focused }) => (
            <MoreHorizontal size={22} color={focused ? colors.primary : colors.textMuted} />
          ),
        }}
      />
    </Tabs>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` | `motion` (rebranded successor) | 2025 | Import path changed from `"framer-motion"` to `"motion/react"`. Drop-in replacement API. New SSR helper: `"motion/react-client"`. |
| Radix Primitives (unstyled) | Radix Themes (pre-styled) | 2023+ | Radix Themes is a complete pre-styled design system built on Radix Primitives. First-party styled components with dark mode support. |
| CSS-only dark/light mode | `next-themes` with class switching | Standard since 2023 | SSR-safe theme injection eliminates flash. System preference detection. Tab sync. |

**Deprecated/outdated:**
- `framer-motion` npm package: Use `motion` instead. Same team, same API, renamed package. The old `framer-motion` import path from `"framer-motion"` still works via compatibility layer but `"motion/react"` is the forward-looking API.
- Manual theme context + inline `<script>` for flash prevention: `next-themes` now does this better with 0 deps and CSP support.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `recharts` is sufficient for donut chart and sparkline visualizations | Standard Stack | If recharts doesn't support the exact donut chart spec, may need to use lightweight SVG (< 3KB) or build custom SVG |
| A2 | `expo-file-system` is the right choice for offline photo storage | Standard Stack | If photo sizes are very large, may need compression before storage |
| A3 | Next.js App Router already supports the `usePathname` hook for `AnimatePresence` keys | Code Examples | Already confirmed — current pages use "use client" and Next.js 14.2 supports this fully |

## Open Questions

1. **How should Radix Themes and Tailwind base styles coexist?**
   - What we know: Radix Themes docs advise against `@tailwind base` due to button reset conflicts. The project currently uses `@tailwind base`.
   - What's unclear: Whether removing `@tailwind base` will break existing components that rely on base reset styles (like the `<*>` border-box reset, default heading margins).
   - Recommendation: Test by moving `@tailwind base` into a named CSS layer and ensuring Radix Themes styles are applied after.

2. **Which Radix Themes components should replace which shadcn/ui components?**
   - What we know: Dialog, Select, Table are candidates for Radix Themes versions (they benefit from auto-theme-switching).
   - What's unclear: The exact selection depends on which pages use which components and whether migration breaks existing functionality.
   - Recommendation: Keep all 15 existing shadcn/ui components initially — only replace specific components (Dialog, Select, Table) if they're used in redesigned pages and benefit from Radix's theme awareness.

3. **Can `@repo/design` be consumed by the mobile app without a build step?**
   - What we know: `packages/shared` has a build script that compiles TypeScript to JS in `dist/`. The mobile app's Metro bundler should resolve workspace packages.
   - What's unclear: Whether Metro can resolve the `exports` field in `package.json` for the new package without additional configuration.
   - Recommendation: Follow the exact same pattern as `@repo/shared` (build to `dist/`, use `main` and `types` fields). If Metro barfs on the `exports` map, simplify to just `main` + `types`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All apps | ✓ | v22.23.1 | — |
| pnpm | Workspace management | ✓ | 9.0.0 | — |
| Next.js | Dashboard | ✓ | 14.2.15 | — |
| Expo SDK | Mobile | ✓ | ~54.0.34 | — |
| Tailwind CSS | Dashboard | ✓ | 3 | — |
| Recharts | Dashboard charts | ✓ | 2.15.1 | Custom SVG |
| Radix UI primitives | Dashboard | ✓ | Multiple versions | — |
| lucide-react | Icons | ✓ | ^1.11.0 | — |
| expo-secure-store | Mobile storage | ✓ | ~15.0.8 | AsyncStorage for larger data |
| expo-file-system | Mobile photo storage | ✗ | — | Install: `pnpm add expo-file-system --filter @repo/mobile` |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** `expo-file-system` — needs install for offline photo storage

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 with ts-jest 29.2.5 (API only) |
| Config file | `apps/api/jest.config.js` |
| Quick run command | `pnpm --filter @repo/dashboard run check-types` (type checking) |
| Full suite command | `pnpm --filter @repo/api run test` (API tests only) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UIX-01 | Design system tokens load correctly | Manual (visual) | N/A — visual verification | ❌ Wave 0 (no visual test framework) |
| UIX-03 | Page transitions render without errors | Smoke | Manual browser test | ❌ Wave 0 |
| UIX-05 | Theme toggle persists preference | Unit | Jest (simulate localStorage) | ❌ Wave 0 |
| UIX-07 | Redesigned pages render all states | Manual (visual) | N/A | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @repo/dashboard run check-types`
- **Per wave merge:** `pnpm --filter @repo/dashboard run check-types && pnpm --filter @repo/dashboard run lint`
- **Phase gate:** Full type-check + lint pass before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] No test framework exists for Dashboard or Mobile apps — Phase 6 introduces significant UI code without test coverage
- [ ] Dashboard components would benefit from `@testing-library/react` + `vitest` setup, but this is out of Phase 6 scope

**Note:** This phase is primarily visual/interaction design. Automated testing of visual output requires a visual regression testing pipeline (Playwright, Chromatic) not present in the project. The plan should rely on manual visual verification with the UI-SPEC.md as the acceptance criteria document.

## Security Domain

> Required when `security_enforcement` is enabled. This phase is pure UI/UX — no backend API changes, no data handling beyond what existing APIs already provide.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth changes in this phase |
| V3 Session Management | no | No session changes |
| V4 Access Control | no | RBAC unchanged |
| V5 Input Validation | no | Input flows unchanged (same API endpoints) |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns for {stack}

No new security threats introduced by Phase 6. Theme state stored in `localStorage` (Dashboard) and `expo-secure-store` (Mobile) follows existing patterns.

**Security note:** The `dangerouslySetInnerHTML` script in `layout.tsx` for service worker registration already exists and is unchanged in this phase.

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] `motion@12.42.2` — confirmed via `npm view motion version`
- [VERIFIED: npm registry] `@radix-ui/themes@3.3.0` — confirmed via `npm view @radix-ui/themes version`
- [VERIFIED: npm registry] `next-themes@0.4.6` — confirmed via `npm view next-themes version`
- [CITED: motion.dev/docs/react-quick-start] — motion installation, import paths, SSR with Next.js
- [CITED: motion.dev/docs/react-animate-presence] — AnimatePresence API, modes, best practices
- [CITED: radix-ui.com/themes/docs/overview/getting-started] — Radix Themes installation, Theme provider, CSS import
- [CITED: radix-ui.com/themes/docs/theme/dark-mode] — Radix Themes + next-themes integration guide
- [CITED: radix-ui.com/themes/docs/overview/styling] — Tailwind coexistence, Next.js import order issue, @tailwind base conflict
- [CITED: github.com/pacocoursey/next-themes] — next-themes API, SSR flash prevention, Tailwind integration

### Secondary (MEDIUM confidence)
- [CITED: npmjs.com/package/motion] — Package details, weekly downloads (12.2M), tree-shakable
- [CITED: npmjs.com/package/next-themes] — Package details, weekly downloads (24M), CSP nonce support

### Tertiary (LOW confidence)
- None — all technology claims verified against official docs or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all packages verified against npm registry + official docs
- Architecture: **HIGH** — patterns verified against official documentation (Radix Themes + next-themes integration is documented by Radix)
- Pitfalls: **HIGH** — Radix Themes import order issue, Tailwind base conflict, and AnimatePresence pitfalls all documented in official sources
- Mobile patterns: **MEDIUM** — mobile offline queue guidance based on expo-secure-store limits (verified) but AsyncStorage fallback details need manual verification on target platform

**Research date:** 2026-07-15
**Valid until:** 2026-08-15 (30 days — motion and Radix Themes are stable, fast-moving packages)
