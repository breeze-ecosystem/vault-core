# Plan 06-01 SUMMARY

**Phase:** 06-premium-experience
**Plan:** 01
**Status:** ✅ Complete

## Objective

Rewrite the CSS variable system to namespace-migrate all existing shadcn/ui vars with `--shadcn-` prefix, integrate Radix Themes CSS import, add light mode overrides, install packages, create ThemeProvider and ThemeToggle, update root layout and sidebar.

## Tasks

| Task | Status | Commit |
|------|--------|--------|
| 1. Namespace-migrate CSS vars + Radix import + light mode + premium utilities | ✅ | e9f494f |
| 2. Update tailwind.config.ts + create ThemeProvider | ✅ | 661a17e |
| 3. Update layout, create ThemeToggle, add to sidebar | ✅ | 300219f |

## Key Decisions

- `--shadcn-*` prefix chosen to prevent collision with Radix Themes CSS variables
- Radix Themes CSS imported via `@import` before `@tailwind` directives to avoid Next.js CSS order bug
- ThemeProvider wraps both next-themes (class-based) and Radix Theme (accentColor="cyan")
- Light mode overrides use `[data-theme="light"]` selector with complementary HSL values
- ThemeToggle uses mounted-state guard to prevent hydration mismatch

## Files Changed

- `apps/dashboard/app/globals.css` — Rewritten with `--shadcn-*` namespace, Radix import, light mode, glass-premium/accent
- `apps/dashboard/tailwind.config.ts` — All `hsl(var(--XXX))` → `hsl(var(--shadcn-XXX))`
- `apps/dashboard/lib/theme-provider.tsx` — New: next-themes + Radix Themes wrapper
- `apps/dashboard/app/layout.tsx` — Removed hardcoded `className="dark"`, added ThemeProvider
- `apps/dashboard/components/theme-toggle.tsx` — New: 3-state dropdown (Clair/Sombre/Automatique)
- `apps/dashboard/components/sidebar.tsx` — Added ThemeToggle above collapse button

## Verification

- ✅ 17+ `--shadcn-*` CSS vars present in globals.css
- ✅ Radix CSS import before Tailwind directives
- ✅ `[data-theme="light"]` selector with overridden values
- ✅ `.glass-premium` and `.glass-accent` utility classes
- ✅ tailwind.config.ts references `--shadcn-*` vars
- ✅ ThemeProvider wraps layout with next-themes + Radix
- ✅ ThemeToggle in sidebar with 3 dropdown items
- ✅ Pre-existing type errors in analytics/sites pages (unrelated)
