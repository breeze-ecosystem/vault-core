# Component Parity: Mobile vs Dashboard

## Token System

| Token | Dashboard (CSS) | Mobile (JS) |
|-------|-----------------|-------------|
| Primary color | `hsl(var(--shadcn-primary))` | `colors.shared.primary` (#06b6d4) |
| Background | `bg-background` / `--shadcn-background` | `colors.dark.bg` (#070912) |
| Surface | `bg-card` / `--shadcn-card` | `colors.dark.surface` (#0c1020) |
| Elevated | N/A (glass) | `colors.dark.elevated` (#1a2332) |
| Text | `text-foreground` / `--shadcn-foreground` | `colors.dark.text` (#f1f5f9) |
| Text secondary | `text-muted-foreground` | `colors.dark.textSecondary` (#94a3b8) |
| Border | `border-border` / `--shadcn-border` | `colors.dark.border` (#1e293b) |
| Destructive | `text-destructive` / `--shadcn-destructive` | `colors.shared.destructive` (#ef4444) |
| Warning | `text-warning` / `--shadcn-warning` | `colors.shared.warning` (#f59e0b) |
| Success | `text-success` / `--shadcn-success` | `colors.shared.success` (#10b981) |

## Typography

| Scale | Dashboard (Tailwind) | Mobile (JS) |
|-------|---------------------|-------------|
| Display | `text-2xl font-semibold` (28px) | `typography.display` (28/600/1.2) |
| Heading | `text-xl font-semibold` (20px) | `typography.heading` (20/600/1.2) |
| Body | `text-sm` (14px) | `typography.body` (14/400/1.5) |
| Label | `text-xs font-semibold` (12px) | `typography.label` (12/600/1.2) |
| Mono (large) | `font-mono tabular-nums text-2xl` | `typography.mono` (24/600) |
| Mono (small) | `font-mono tabular-nums text-sm` | `typography.monoSmall` (14/600) |

## Navigation Parity

The 4-tab mobile navigation mirrors the dashboard sidebar structure:

| Mobile Tab | Dashboard Sidebar Group |
|------------|------------------------|
| Accueil | Tableau de bord (Overview) |
| Caméras | Caméras |
| Incidents | Incidents |
| Plus | Paramètres, Chat IA, Sites, Audit, Licences |

## Component Mapping

| Dashboard Component | Mobile Equivalent | Status |
|--------------------|-------------------|--------|
| GlassCard | N/A (native View + border/background) | N/A |
| MetricHero | Inline stats card in index.tsx | Partial |
| DonutChart | N/A (Phase 8) | Future |
| ActivityTimeline | N/A (Phase 8) | Future |
| QuickActionBar | QuickActionButton grid | Complete |
| ThemeToggle | N/A (system theme) | N/A |
