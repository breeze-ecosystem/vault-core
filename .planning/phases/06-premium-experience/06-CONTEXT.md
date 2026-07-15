# Phase 6: Premium Experience - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Design system component library (Radix Themes + Tailwind CSS with namespace-migrated shadcn/ui) + premium visual redesign of Dashboard (3 key pages with full layout rearchitecture + global design uplift) and Mobile (guard-first redesign with 4-tab navigation and offline-capable quick actions). Dark/light mode toggle with system preference detection. Fluid page transitions and micro-interactions via `motion`.

Covers UIX-01 through UIX-07 from REQUIREMENTS.md.
</domain>

<decisions>
## Implementation Decisions

### Design System Foundation (UIX-01)
- **D-01:** Adopt Radix Themes alongside existing shadcn/ui + Tailwind CSS. Resolve CSS variable conflicts via namespace migration.
- **D-02:** Prefix existing shadcn/ui CSS vars (e.g., `--shadcn-background`) to avoid collision with Radix Themes vars. Map Radix Themes CSS vars to Tailwind utility classes.
- **D-03:** All design tokens (colors, typography, spacing, shadows) defined as CSS custom properties in `globals.css` using HSL values. Tailwind `extend` references these CSS vars for runtime-switchable dark/light theming.
- **D-04:** Mobile shares design tokens (colors, typography scale) as JS constants exported from a shared package (`@repo/design`). Dashboard uses CSS vars, Mobile imports JS constants. A component spec document ensures visual parity across platforms (no NativeWind).

### Animation & Motion (UIX-03)
- **D-05:** Use `motion` (successor to framer-motion, ~15KB gzipped) for animations. Install as a new dependency — currently not present.
- **D-06:** Two-layer animation strategy: (a) `AnimatePresence` for page/route transitions at the dashboard layout level, (b) component-level micro-interactions — staggered list reveals, hover state animations, card entrance effects, notification slide-ins.

### 3 Key Page Redesigns (UIX-07)
- **D-07:** Overview page — full layout rearchitecture: live metrics hero section, data visualization (sparkline trends, donut charts for alert severity), quick-action toolbar, real-time activity timeline. Custom layout, not reusing existing stats-card pattern.
- **D-08:** Cameras page — live grid + map/floorplan split view: responsive camera thumbnail grid with status overlays (online/offline/recording), quick-play hover preview, floorplan/map showing camera positions, always-visible filter/search bar.
- **D-09:** Alerts page — real-time feed + triage side panel: live-scrolling alert feed with severity color bars, inline video thumbnail for camera-linked alerts, detail/action side panel, bulk acknowledge/resolve toolbar.

### Mobile Guard-First Design (UIX-04)
- **D-10:** 4-tab simplified navigation: Dashboard (overview + quick actions), Cameras (live grid), Incidents (capture + triage), More (settings + chat + sites). Bigger touch targets, guard-optimized labels.
- **D-11:** Quick-action shortcuts on home screen — primary row: Check In (location+timer), Report Incident (photo+capture), Control Door (open/close). Secondary row: View Alerts, Find Camera.
- **D-12:** Offline mode: check-in/out works offline (queued sync). Cached camera list and recent alerts available offline. Incident capture stores photo + notes locally, syncs on reconnect.

### Agent Discretion
- Dark/light mode toggle implementation (toggle switch placement, system preference detection via `prefers-color-scheme`, theme persistence strategy).
- UIX-06 global uplift for all existing pages (consistent typography scale, spacing rhythm, color tokens, component styles) — clear requirement, implement using the new design system tokens without rewriting page logic.
- CSS namespace migration approach (exact prefix naming convention, migration ordering — which files to update first, Radix Themes installation and provider setup).
- Radix Themes component selection (which Radix components to use vs which to keep as shadcn/ui).
- Overview/Cameras/Alerts page component structure and data fetching setup.
- Mobile quick-action button component design and animation.
- Shared design token package structure (`@repo/design` or under `packages/shared`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 6 definition, UIX-01 to UIX-07 requirements, success criteria
- `.planning/REQUIREMENTS.md` — Full requirement text for UIX-01 through UIX-07
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack boundaries

### State & Prior Decisions
- `.planning/STATE.md` — Known blockers (Radix Themes + Tailwind coexistence), prior phase context
- `.planning/phases/04-commercial-foundation/04-CONTEXT.md` — Design system patterns, component conventions, existing shadcn/ui setup
- `.planning/phases/05-monetization/05-CONTEXT.md` — License management UI patterns to extend

### Architecture & Code Patterns
- `.planning/codebase/STRUCTURE.md` — Dashboard app structure, component locations, page routing patterns
- `.planning/codebase/CONVENTIONS.md` — Naming, React component style, Tailwind usage, mobile StyleSheet patterns
- `.planning/codebase/STACK.md` — Tailwind CSS 3, shadcn/ui, Radix primitives, Expo SDK 54, React Native StyleSheet

### Source Code (Key Files)
- `apps/dashboard/app/globals.css` — Current CSS custom properties (dark theme only), glass effects, Tailwind layers
- `apps/dashboard/tailwind.config.ts` — Current Tailwind configuration (extend, colors, animations)
- `apps/dashboard/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `apps/dashboard/components/ui/` — 15 existing shadcn/ui components (button, card, table, dialog, toast, tooltip, dropdown-menu, scroll-area, separator, slot, avatar)
- `apps/dashboard/app/(dashboard)/page.tsx` — Current Overview/Home page
- `apps/dashboard/app/(dashboard)/cameras/` — Current Cameras pages
- `apps/dashboard/app/(dashboard)/alertes/` — Current Alertes pages
- `apps/mobile/lib/theme.ts` — Current mobile color tokens, typography scale, spacing, shadows
- `apps/mobile/app/(tabs)/_layout.tsx` — Current tab navigation configuration (6 tabs)
- `apps/mobile/app/(tabs)/index.tsx` — Current mobile dashboard/home tab
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **15 shadcn/ui components** (`apps/dashboard/components/ui/`): button, card, table, dialog, toast, tooltip, dropdown-menu, scroll-area, separator, slot, avatar — will be namespace-migrated to coexist with Radix Themes
- **Glass card effect** (`apps/dashboard/app/globals.css:75`): Existing `.glass` utility with backdrop-blur — base for glassmorphism panels
- **Animated grid background** (`apps/dashboard/app/globals.css:56`): `.bg-grid` utility with subtle primary-colored grid — reusable premium texture
- **Scan line effect** (`apps/dashboard/app/globals.css:64`): `.bg-scan` utility for CRT/security-monitor aesthetic
- **Mobile theme.ts** (`apps/mobile/lib/theme.ts`): Color tokens, typography, spacing, borderRadius, shadows — will be source of truth for shared JS constants
- **I18nProvider** (`apps/dashboard/lib/i18n/context.tsx`): Existing i18n context — dark/light mode toggle can follow same pattern
- **Status-pulse animation** (`apps/dashboard/app/globals.css`): Custom `status-pulse` keyframe for online indicators

### Established Patterns
- **Tailwind utility-first + cn()**: All Dashboard components use `cn()` (clsx + tailwind-merge) for class composition
- **Component variants via cva**: shadcn/ui uses `class-variance-authority` for variant management — extend this pattern for new Radix-themed components
- **Dark theme default**: `<html className="dark">` in root layout — light mode toggling will need opposite class
- **Semantic color tokens**: `text-primary`, `bg-muted`, `border-input` — extend token set
- **Named export for components** (Dashboard), default export for pages (Next.js convention)
- **StyleSheet.create()** for mobile components — stays, no migration to Tailwind

### Integration Points
- **Root layout** (`apps/dashboard/app/layout.tsx`): Add Radix Themes provider, dark/light mode context, AnimatePresence
- **Dashboard layout** (`apps/dashboard/components/dashboard-layout.tsx`): Add page transition animations
- **Tailwind config** (`apps/dashboard/tailwind.config.ts`): Extend with new custom properties, Radix Theme references
- **globals.css**: Replace current `:root` vars with namespace-migrated vars, add light mode `:root.light` or `.light`, add Radix Theme CSS imports
- **Mobile tab layout** (`apps/mobile/app/(tabs)/_layout.tsx`): Redesign for 4-tab nav
- **Mobile home** (`apps/mobile/app/(tabs)/index.tsx`): Add quick-action shortcuts
- **Mobile API client** (`apps/mobile/lib/api.ts`): Add offline queue logic for check-in/incident capture
- **packages/shared** or new `packages/design`: Add shared design tokens package

### Creative Options
- Radix Themes installation will need `@radix-ui/themes` package + provider wrapper
- Namespace migration can be done file-by-file (no breaking change until shadcn vars are renamed)
- Dark/light mode can use `next-themes` or custom React context + CSS class toggling
- Mobile offline queue can use expo-secure-store for small payloads or AsyncStorage for larger incident data
</code_context>

<specifics>
## Specific Ideas

No external references or "make it like X" moments from discussion. All decisions above are implementation-level convergences.

Key preferences evident: premium SaaS feel (Linear/Vercel-inspired), full layout rearchitecture for key pages, shared tokens with component specs for cross-platform parity, guard-first simplification for mobile, motion over CSS-only for fluid feel.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 6 scope.

</deferred>

---

*Phase: 6-Premium-Experience*
*Context gathered: 2026-07-15*
