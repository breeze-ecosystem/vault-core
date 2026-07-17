# Phase 4: Marketing Site Redesign - Research

**Researched:** 2026-07-17
**Domain:** Next.js 14 marketing site with i18n, animations, and premium frontend architecture
**Confidence:** HIGH

## Summary

Phase 4 transforms the existing `apps/marketing/` Next.js 14 application from a light-themed content site into a premium dark-tech showcase with glassmorphism design, 6 new route segments (produits, solutions, etudes-de-cas, demo), and full 6-language translation consistency. This is an in-place refactor (D-17) — no parallel build required.

The existing codebase uses next-intl 4.13.2 for i18n with 6 locale JSON files, `motion` ^12.42.2 for animations, Tailwind CSS 3 with HSL CSS variables for theming, and velite for MDX content. The redesign replaces IBM Plex Sans with Inter + Plus Jakarta Sans, rewrites the globals.css for dark-only theme (D-04), updates all component styling, and adds ~16 new page components.

**Primary recommendation:** Execute this phase as an in-place component replacement wave, starting with foundational infrastructure (CSS variables, fonts, Tailwind config), then updating shared components (Header, Footer, Button, AnimatedSection), then creating new route pages with their section components. This minimizes risk of breaking existing working pages (blog, pricing, contact).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-01 | Premium dark theme, fluid animations, glassmorphism accents | D-02/D-03 define exact visual direction. Tailwind CSS `backdrop-blur` utilities, CSS `backdrop-filter`, and `motion` library all available. |
| MKT-02 | Product pages, industry solutions, case studies | D-12/D-13 define route structure (produits/, solutions/, etudes-de-cas/). velite supports adding `caseStudies` collection. 6 new route groups needed. |
| MKT-03 | 6-language translation consistency | Existing next-intl infrastructure handles 6 locales. New message keys needed for all new pages. RTL for Arabic via `dir` attribute already implemented in locale layout. |
| MKT-04 | Interactive demo/feature tour | D-08/D-09/D-10 define clickable screenshot tour on `/demo`. Custom mockup component with step-by-step tooltip overlay using client-state navigation. |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Marketing site has a distinct visual identity from the Dashboard — own brand language, colors, fonts, animations. Not reusing shadcn/ui or Dashboard design tokens.
- **D-02:** Dark tech premium direction — deep navy/cyber backgrounds, cyan/teal accent, glassmorphism panels, fluid scroll animations.
- **D-03:** Full glassmorphism suite — backdrop blur panels, gradient borders, animated grid/particle backgrounds, subtle noise textures.
- **D-04:** Dark-only theme. No light mode toggle.
- **D-05:** Update and wire `packages/design/src/marketing.ts` tokens to new dark premium direction.
- **D-06:** Mixed hero approach — WOW focal point + 1-2 strategic WOW moments.
- **D-07:** Replace IBM Plex Sans with Inter (body) + Plus Jakarta Sans (headings). Keep JetBrains Mono for code/data.
- **D-08:** Clickable screenshot tour — polished custom mockups with step-by-step tooltip narration. Not a live sandbox.
- **D-09:** Single end-to-end narrative — access event → video evidence → AI analysis → alert dispatch → resolution.
- **D-10:** Dedicated `/demo` page accessible from hero CTA and navigation.
- **D-11:** Custom polished mockups (not real Dashboard screenshots).
- **D-12:** Separate route segments — Products (`/produits`), Solutions (`/solutions`), Case studies (`/etudes-de-cas`).
- **D-13:** Full scope: Products overview + 4 sub-pages; Solutions overview + 2 industry pages; Case studies listing + 2 sample studies.
- **D-14:** Existing pages preserved: Blog, Contact, Pricing.
- **D-15:** Subtle micro-animations (Linear-style) — fade-up on scroll, hover scale, smooth transitions.
- **D-16:** Animated elements: major section pieces only — hero, section titles, feature cards, stats counters, CTA.
- **D-17:** In-place refactor — evolve existing `apps/marketing/`. No parallel build.
- **D-18:** French-first workflow — all new content in French first, then translated to 5 other locales.
- **D-19:** Full RTL support for Arabic (ar) — mirrored layout, right-aligned text, flipped animations.

### Agent's Discretion
- Exact font files and integration (Inter via next/font + geometric display)
- Glassmorphism implementation details (CSS vs Tailwind utilities)
- Scroll animation timing and easing curves
- Feature tour step count and content flow
- Mockup tooling and format (Figma exports, static screens)
- RTL implementation approach (CSS logical properties vs manual mirroring)
- Blog/posts MDX content for velite
- SEO metadata strategy per page
- OG image generation (satori is already in the stack)
- Contact form and pricing page polish (existing pages)

### Deferred Ideas (OUT OF SCOPE)
- Live demo sandbox (MKT-05) — v3.1
- Documentation section (MKT-06) — v3.1
- Healthcare & Logistics industry pages — future phases
- Event badge creation at kiosk — already deferred
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Page rendering | Frontend Server (SSR) | — | Marketing site is Next.js server-rendered. No API tier needed. |
| i18n / translations | Frontend Server (SSR) | — | next-intl handles at request time. No backend translation service. |
| Animations / motion | Browser (Client) | — | framer-motion (`motion`) runs client-side via 'use client' components. |
| Interactive tour | Browser (Client) | — | `/demo` is a fully client-interactive page with state-based step navigation. |
| Content pipeline | Build-time (velite) | — | velite processes MDX at build time for blog/case studies. |
| SEO / structured data | Frontend Server (SSR) | — | Server components generate JSON-LD, meta tags, sitemap. |
| Form submission (contact) | Browser → API | API | Contact form POST goes to NestJS `/api/contact` endpoint. |
| Routing / navigation | Frontend Server (SSR) | Browser | Server renders initial content; client router handles SPA transitions. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^14.2.15 | Page framework | Existing app. App Router with server components. |
| next-intl | ^4.13.2 | i18n routing + translations | Already integrated. 6 locales with `[locale]` segment. |
| motion | ^12.42.2 | Scroll/hover/micro-animations | Already a dependency. Replaces framer-motion in v12+. |
| Tailwind CSS | 3 | Utility-first styling | Already configured. Will update for dark-only theme. |
| tailwindcss-animate | ^1.0.7 | Tailwind animation utilities | Already configured. |
| @tailwindcss/typography | ^0.5 | Prose styles (blog, case studies) | Already configured. |
| velite | ^0.4.0 | MDX content pipeline | Already used for blog. Extend for case studies. |
| lucide-react | ^1.11.0 | Icon library | Already a dependency. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| inter | Google Font | Body text (400/600) | next/font/google import for Inter |
| plus-jakarta-sans | Google Font | Headings (600) | next/font/google import for Plus Jakarta Sans |
| jetbrains-mono | Google Font | Code/data (400/500/600) | Already used, keep via next/font/google |
| satori | ^0.28.0 | OG image generation | Already in stack. Use for new page OG images. |
| class-variance-authority | ^0.7.1 | Component variants | Already in use for Button. |
| clsx / tailwind-merge | as-is | cn() utility | Already in use. |
| next/font/google | built-in | Font loading | Replace current @import in globals.css |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plus Jakarta Sans | Satoshi (via fontsource) | Satoshi is not on Google Fonts — requires self-hosting. Plus Jakarta Sans works with next/font/google. |
| motion | CSS-only animations (animate.css) | motion provides scroll-trigger, stagger, spring physics impossible in pure CSS. |
| velite for case studies | Manual JSON/MDX in pages | velite already handles MDX pipeline, content typing, and locale filtering. Reuse the pattern. |

**Version verification:** [VERIFIED: npm registry]
- `motion@12.42.2` verified
- `next-intl@4.13.2` verified
- `velite@0.4.0` verified

## Package Legitimacy Audit

> No new external packages need to be installed. All dependencies are already in the project. Fonts are loaded via `next/font/google` (no package install). The redesign uses only existing libraries.

| Package | Registry | Age | Downloads | slopcheck | Disposition |
|---------|----------|-----|-----------|-----------|-------------|
| (no new packages) | — | — | — | — | Not applicable |

**Existing deps reused without change:** `motion`, `next-intl`, `velite`, `lucide-react`, `satori`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`

## Codebase Analysis

### Existing Architecture
The marketing site (`apps/marketing/`) is a Next.js 14 App Router application with `[locale]` dynamic routing via next-intl:

```
apps/marketing/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx          # Locale layout (html dir, next-intl provider, JSON-LD)
│   │   ├── page.tsx            # Homepage (Header, Hero, Features, AI, Testimonials, Stats, CTA, Footer)
│   │   ├── blog/               # Blog listing + detail (velite MDX)
│   │   ├── pricing/            # Pricing page
│   │   ├── contact/            # Contact form
│   │   └── not-found.tsx       # 404
│   ├── layout.tsx              # Root layout (viewport, metadata, JSON-LD)
│   ├── globals.css             # CSS variables, grid bg, scrollbar, reduced-motion
│   ├── sitemap.ts              # Per-locale sitemap with hreflang
│   └── robots.ts               # Robots config
├── components/
│   ├── landing/                # 11 components (HeroSection, FeatureShowcase, etc.)
│   ├── layout/                 # Header, Footer, Container, Section, MobileMenu
│   ├── ui/                     # Button, Logo, AnimatedSection, Badge, PageHeader, Skeleton
│   ├── navigation/             # NavLink, LanguageSwitcher
│   ├── blog/                   # BlogGrid, BlogCard, BlogPostLayout, etc.
│   ├── pricing/                # PricingCard, FAQSection, FeatureComparisonTable
│   └── contact/                # ContactForm, FormField, SuccessMessage, etc.
├── messages/                   # 6 locale JSON files (en, fr, es, de, ja, ar)
├── src/
│   ├── i18n/                   # routing.ts, navigation.ts, request.ts
│   └── lib/                    # utils.ts (cn), seo.tsx (JSON-LD helpers), velite.ts
└── content/blog/               # MDX blog posts
```

### Key Integration Points

| File | Role | What Changes |
|------|------|--------------|
| `globals.css` | CSS variables (HSL), grid background, scrollbar, reduced-motion | **Full rewrite** — dark-only theme, new colors, noise texture, glass utilities |
| `tailwind.config.ts` | Theme config (colors, fonts, animations, plugins) | **Update** — new font families, new colors matching dark theme, new animations |
| `app/[locale]/layout.tsx` | Locale layout with next-intl, font loading | **Update** — add Inter + Plus Jakarta Sans via next/font/google |
| `app/layout.tsx` | Root layout | **Minor** — update title template, add new JSON-LD |
| `app/sitemap.ts` | Sitemap generator | **Update** — add new routes (produits, solutions, etudes-de-cas, demo) |
| `components/layout/header.tsx` | Sticky nav | **Full rewrite** — glass sticky nav, new links, mobile overlay with staggered animate |
| `components/layout/footer.tsx` | Footer | **Full rewrite** — dark bg, glass divider, new columns |
| `components/layout/section.tsx` | Section wrapper | **Update** — py-24 default, dark variant colors |
| `components/ui/button.tsx` | Button component (cva) | **Update** — add `glass` variant, update colors |
| `components/ui/animated-section.tsx` | Scroll fade-up wrapper | **Update** — use `motion` `whileInView` instead of CSS transitions |
| `components/landing/` | All landing sections | **Full rewrite** — dark theme, glassmorphism, new animations |
| `messages/*.json` | Translation strings | **Update** — add keys for all new routes and content |
| `velite.config.ts` | MDX content collections | **Update** — add `caseStudies` collection |
| `packages/design/src/marketing.ts` | Marketing design tokens | **Update** — dark theme colors, new typography |

### Existing Patterns to Follow

**Page pattern (every page):**
```typescript
// 1. Generate static params for all locales
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// 2. Generate metadata with locale-appropriate SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> { ... }

// 3. Server component with setRequestLocale, Header → main → sections → Footer
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return ( <>
    <Header />
    <main>
      <Section>...</Section>
      <CTASection />
    </main>
    <Footer />
  </> );
}
```

**Section pattern:**
- Each section is a separate `'use client'` component in `components/landing/`
- Wraps content in `<Section>` (vertical spacing) → `<Container>` (max-width)
- Uses `<AnimatedSection>` for scroll-triggered fade-up
- Content comes from `useTranslations()` or hardcoded (for sections without locale-driven content)

### RTL Architecture (D-19)

The existing locale layout (`app/[locale]/layout.tsx`) already handles RTL:
```typescript
const rtlLocales = new Set(['ar']);
const direction = rtlLocales.has(locale) ? 'rtl' : 'ltr';
<html lang={locale} dir={direction} className="dark">
```

For components, use Tailwind's logical properties where practical:
- `mr-*` / `ml-*` → `me-*` / `ms-*` (margin-inline-end/start)
- `pr-*` / `pl-*` → `pe-*` / `ps-*` (padding-inline-end/start)
- `text-left` / `text-right` → `text-start` / `text-end`
- For icons in RTL, conditionally flip with `[dir="rtl"] & { transform: scaleX(-1) }`

## Architecture Patterns

### System Architecture Diagram

```
User Browser
    │
    ▼
Caddy (reverse proxy)
    │
    ▼
Next.js 14 Server (apps/marketing/)
    │
    ├──▶ [locale] segment ──▶ next-intl routing
    │       │                    │
    │       ▼                    ▼
    │   Page Component      Messages JSON
    │       │               (6 locales)
    │       ▼
    │   Server Components (SSR)
    │       │
    │       ├──▶ Header (glass sticky nav)
    │       ├──▶ Hero Section (motion staggered)
    │       ├──▶ Feature Cards (AnimatedSection scroll)
    │       ├──▶ Stats Counter (motion animate)
    │       ├──▶ Demo Tour Client Component
    │       ├──▶ CTASection
    │       └──▶ Footer (dark, glass divider)
    │
    └──▶ velite (build-time MDX)
            │
            ├──▶ content/blog/*.mdx → Post collection
            └──▶ content/case-studies/*.mdx → CaseStudy collection (NEW)
```

### Recommended Project Structure (New/Modified Files)

```
apps/marketing/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              ★ UPDATE — new fonts
│   │   ├── page.tsx                ★ REWRITE — premium dark homepage
│   │   ├── produits/
│   │   │   ├── page.tsx            🆕 Products overview
│   │   │   ├── video/page.tsx      🆕 Video Intelligence
│   │   │   ├── access-control/page.tsx  🆕 Access Control
│   │   │   ├── ai-analytics/page.tsx    🆕 AI Analytics
│   │   │   └── analytics/page.tsx       🆕 Reporting & Analytics
│   │   ├── solutions/
│   │   │   ├── page.tsx            🆕 Solutions overview
│   │   │   ├── enterprise-campuses/page.tsx  🆕 Enterprise Campuses
│   │   │   └── critical-infrastructure/page.tsx  🆕 Critical Infrastructure
│   │   ├── etudes-de-cas/
│   │   │   ├── page.tsx            🆕 Case studies listing
│   │   │   └── [slug]/page.tsx     🆕 Case study detail (velite MDX)
│   │   ├── demo/
│   │   │   └── page.tsx            🆕 Interactive demo tour
│   │   ├── blog/                   ← Keep, styling refresh
│   │   ├── pricing/                ← Keep, styling refresh
│   │   ├── contact/                ← Keep, styling refresh
│   │   └── not-found.tsx           ★ UPDATE — restyle
│   ├── globals.css                 ★ REWRITE — dark-only, glassmorphism, noise
│   ├── sitemap.ts                  ★ UPDATE — add new routes
│   └── layout.tsx                  ★ UPDATE — metadata
├── components/
│   ├── landing/                    ★ REWRITE all 11 components
│   │   ├── hero-section.tsx
│   │   ├── feature-showcase.tsx
│   │   ├── feature-card.tsx
│   │   ├── ai-highlight-section.tsx
│   │   ├── testimonial-carousel.tsx
│   │   ├── testimonial-card.tsx
│   │   ├── stats-section.tsx
│   │   ├── cta-section.tsx
│   │   ├── trust-bar.tsx
│   │   ├── ai-grid-background.tsx
│   │   └── scroll-indicator.tsx
│   ├── layout/                     ★ REWRITE
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── container.tsx           ← Keep
│   │   ├── section.tsx             ★ UPDATE
│   │   └── mobile-menu.tsx         ★ REWRITE
│   ├── ui/
│   │   ├── button.tsx              ★ UPDATE — add glass variant
│   │   ├── animated-section.tsx    ★ UPDATE — motion whileInView
│   │   ├── logo.tsx                ← Keep (or update colors)
│   │   ├── badge.tsx               ← Keep
│   │   ├── page-header.tsx         ★ UPDATE — new typography
│   │   ├── skeleton.tsx            ← Keep
│   │   └── analytics.tsx           ← Keep
│   ├── navigation/
│   │   ├── nav-link.tsx            ★ UPDATE — new active indicator
│   │   └── language-switcher.tsx   ★ UPDATE — restyle
│   ├── products/                   🆕 New directory
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   └── product-detail-layout.tsx
│   ├── solutions/                  🆕 New directory
│   │   ├── solution-card.tsx
│   │   ├── solution-grid.tsx
│   │   └── solution-detail-layout.tsx
│   ├── case-studies/               🆕 New directory
│   │   ├── case-study-card.tsx
│   │   ├── case-study-grid.tsx
│   │   └── case-study-layout.tsx
│   ├── demo/                       🆕 New directory
│   │   ├── demo-tour.tsx
│   │   └── demo-step.tsx
│   ├── shared/                     🆕 New directory
│   │   ├── glass-panel.tsx
│   │   ├── gradient-border.tsx
│   │   ├── eyebrow-tag.tsx
│   │   ├── noise-overlay.tsx
│   │   └── stats-counter.tsx
│   ├── blog/                       ★ UPDATE — restyle cards/layout
│   ├── pricing/                    ★ UPDATE — restyle cards
│   └── contact/                    ★ UPDATE — restyle form
├── content/
│   └── case-studies/               🆕 New directory
│       ├── fr/
│       │   ├── campus-entreprise.mdx
│       │   └── infrastructure-critique.mdx
│       └── en/
│           ├── enterprise-campus.mdx
│           └── critical-infrastructure.mdx
├── messages/
│   ├── fr.json                     ★ UPDATE — add new keys
│   ├── en.json                     ★ UPDATE — add new keys
│   ├── es.json                     ★ UPDATE — add new keys
│   ├── de.json                     ★ UPDATE — add new keys
│   ├── ja.json                     ★ UPDATE — add new keys
│   └── ar.json                     ★ UPDATE — add new keys
└── tailwind.config.ts              ★ UPDATE — fonts, colors, animations
```

### Pattern 1: Server Component Page Template

**What:** Every new page follows the established pattern of `generateStaticParams` + `generateMetadata` + async Server Component with Header/footer.

**Example:**
```typescript
// app/[locale]/produits/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductsHero } from '@/components/products/products-hero';
import { ProductGrid } from '@/components/products/product-grid';
import { CTASection } from '@/components/landing/cta-section';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Produits - OVERSIGHT AI',
    description: 'Découvrez nos solutions...',
    alternates: { canonical: `https://oversighthub.com/${locale}/produits` },
  };
}

export default async function ProduitsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return ( <>
    <Header />
    <main>
      <ProductsHero />
      <ProductGrid />
      <CTASection />
    </main>
    <Footer />
  </> );
}
```

### Pattern 2: Scroll-Triggered Fade-Up (AnimatedSection)

**What:** Wraps any section with a motion-based entrance animation. Existing `AnimatedSection` uses CSS transitions — upgrade to `motion` `whileInView` for the premium easing curves.

**Example:**
```typescript
'use client';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.16, 1, 0.3, 1],  // premium cubic-bezier
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

### Pattern 3: Glass Panel Component

**What:** Reusable glassmorphism card. Used for feature cards, testimonial cards, demo tooltips, pricing cards.

**Example:**
```typescript
'use client';
import { cn } from '@/src/lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassPanel({ children, className, hover = false }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl',
        hover && 'transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.10] hover:scale-[1.02]',
        className,
      )}
    >
      {children}
    </div>
  );
}
```

### Pattern 4: Staggered Children Animation

**What:** Used in hero section and mobile menu to create wave-like staggered entrances with increasing delays.

```typescript
'use client';
import { motion } from 'motion/react';

const staggerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

// Usage in JSX:
{items.map((item, i) => (
  <motion.div
    key={item.key}
    custom={i}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={staggerVariants}
  >
    {item.content}
  </motion.div>
))}
```

### Pattern 5: Clickable Screenshot Demo Tour (MKT-04)

**What:** State-based client component that cycles through mockup screenshots with overlay tooltips. Single end-to-end narrative per D-09.

```typescript
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  mockup: string;        // path to static mockup image
  tooltipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'access-event',
    title: 'Événement d\'accès entrant',
    description: 'Un badge est scanné à l\'entrée...',
    mockup: '/static/demo/access-event.png',
    tooltipPosition: 'top-right',
  },
  // ...more steps following the narrative
];

export function DemoTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = DEMO_STEPS[currentStep];

  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Mockup container */}
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10">
        <img src={step.mockup} alt={step.title} className="h-full w-full object-cover" />
        
        {/* Tooltip overlay — positioned via step config */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 right-4 max-w-sm rounded-xl bg-black/80 backdrop-blur-xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm text-white/70">{step.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="...">Précédent</button>
        <div className="flex gap-2">
          {DEMO_STEPS.map((_, i) => (
            <button key={i} onClick={() => setCurrentStep(i)}
              className={`h-2 w-2 rounded-full transition-all ${i === currentStep ? 'w-8 bg-cyan-500' : 'bg-white/20'}`} />
          ))}
        </div>
        <button onClick={() => setCurrentStep(Math.min(DEMO_STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === DEMO_STEPS.length - 1}
          className="...">Suivant</button>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Window scroll listeners for animations:** Use `motion` `whileInView` or `IntersectionObserver` instead. The existing Header uses `window.addEventListener('scroll')` — this is acceptable for sticky nav but not for scroll-triggered reveals.
- **CSS `darkMode: 'media'` in Tailwind:** D-04 says dark-only. Change to `darkMode: 'class'` (or remove entirely since `<html className="dark">` is always set).
- **animating `top`, `left`, `width`, `height`:** Use only `transform` and `opacity` for GPU-accelerated animations.
- **`backdrop-blur` on scrolling containers:** Only apply to sticky/fixed elements (nav, overlays). Performance issue on mobile.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MDX content pipeline | Custom file parser for case studies | velite (existing) | Already configured for blog. Extend with `caseStudies` collection — handles MDX compilation, slug generation, frontmatter validation. |
| i18n routing | Custom locale detection | next-intl (existing) | Already handles locale prefix, redirect, message loading, RTL. |
| Scroll animations | IntersectionObserver from scratch | motion `whileInView` | Already a dependency. Handles viewport detection, animation, cleanup. Removes boilerplate. |
| Component class merging | String concatenation | cn() utility + tailwind-merge | Already in use. Resolves conflicting Tailwind classes. |
| OG image generation | Server-side screenshot service | satori (existing) | Already in stack. Generates PNG from JSX at build/request time. |

**Key insight:** The codebase already has all major infrastructure (i18n, content pipeline, animation library, UI utilities). The redesign is primarily a visual overhaul — updating CSS variables, component styles, font configuration, and adding new page components. No new libraries needed.

## Implementation Risks & Mitigations

### Risk 1: CSS Variable Refactoring Breaks Existing Pages
**What goes wrong:** The `globals.css` rewrite from light-mode to dark-only HSL variables could break blog, pricing, and contact pages that depend on the current variable values.
**Mitigation:** The existing variables use `--marketing-*` prefix. Keep the same variable names but change values to dark mode equivalents. All components reference variables by name (`hsl(var(--marketing-primary))`), so they auto-update. Test by building the marketing app after the globals.css change.

### Risk 2: Font Migration Breaks Layout
**What goes wrong:** Replacing IBM Plex Sans (body) with Inter + Plus Jakarta Sans changes metrics (x-height, spacing, line wrapping). Blog post prose, pricing tables, and contact forms may overflow or look wrong.
**Mitigation:** Replace fonts in this order: (1) Add Inter/PJS via next/font/google in layout.tsx, (2) Update tailwind `fontFamily`, (3) Remove Google Fonts @import from globals.css, (4) Visually verify all existing pages. Inter and PJS have similar metrics to IBM Plex Sans, so the risk is medium.

### Risk 3: RTL Testing Gap for Arabic
**What goes wrong:** New components (ProductCard, SolutionCard, Demo tour) may not respect `dir="rtl"` on the `<html>` element. Framer-motion `translateX` animations may be wrong direction.
**Mitigation:** Use CSS logical properties (`ms-*`, `me-*`, `text-start`, `text-end`) in all new components. For motion animations that translate horizontally, use a conditional approach:
```typescript
const direction = document.documentElement.dir === 'rtl' ? -1 : 1;
initial={{ x: 24 * direction }}
```

### Risk 4: Demo Tour Mockup Assets Not Specified Yet
**What goes wrong:** D-11 specifies "custom polished mockups" but these are Figma exports that need to be created. The component can be built with placeholder images, but the final product needs real assets.
**Mitigation:** Build the `DemoTour` component with placeholder `<div>` mockups first (styled divs with labels), then swap in real images. This decouples component development from asset creation.

### Risk 5: velite `caseStudies` Collection Duplicates Blog Patterns
**What goes wrong:** Adding a `caseStudies` collection to velite.config.ts means maintaining two parallel MDX pipeline configurations.
**Mitigation:** The `caseStudies` schema is almost identical to `posts` schema. Create a shared `BaseContent` schema type via `s.object({...})` composition to avoid duplication. Keep locale filtering and metadata generation patterns consistent.

## Common Pitfalls

### Pitfall 1: Dark-Only Theme Improperly Configured
**What goes wrong:** Tailwind `darkMode: 'media'` is currently set, meaning dark mode requires `prefers-color-scheme: dark`. The marketing site always renders with `className="dark"` on `<html>`, but Tailwind v3 respects `media` strategy first, which may override the class.
**How to avoid:** Change `darkMode` to `'class'` or `['class']` in `tailwind.config.ts`. Since the locale layout already sets `className="dark"`, Tailwind will always apply dark variant styles. However, with D-04 (dark-only), there's no need for a dark mode toggle at all — just remove `darkMode` config entirely and define colors directly without `dark:` prefixes.

### Pitfall 2: Glassmorphism Performance on Mobile
**What goes wrong:** `backdrop-blur-xl` on multiple scrolling cards causes frame drops on mobile due to GPU compositing cost.
**How to avoid:** Apply `backdrop-blur` *only* to sticky/fixed elements (nav, mobile overlay, demo tooltip). For cards and panels, use semi-transparent backgrounds (`bg-white/[0.03]`) with subtle border (`border-white/[0.06]`) — the visual effect is similar but GPU-friendly. Follow the UI-SPEC performance constraints.

### Pitfall 3: Translation Keys for New Routes Not Added Consistently
**What goes wrong:** New pages reference message keys that don't exist yet, causing runtime errors in next-intl. Or some locales have missing translations that fall back to English/French.
**How to avoid:** Define *all* new message keys across all 6 locale files before building page components. Use the existing message structure pattern. After adding new keys, verify with a quick test that each locale file parses as valid JSON and contains all required keys.

### Pitfall 4: RTL-LTR Layout Contradictions in Same Component
**What goes wrong:** A component uses `left-0` for positioning but also has `text-right` — works fine in LTR but breaks in RTL.
**How to avoid:** Use `start-0` / `end-0` (Tailwind v3 `inset-inline-start`), `text-start` / `text-end`, `ms-*` / `me-*` for all new components. For existing components being restyled, audit for `left`/`right` positioning and update.

## Code Examples

### Font Loading (D-07)
```typescript
// app/[locale]/layout.tsx — updated font configuration
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  weight: ['400', '600'],  // only weights we use
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// In the JSX:
<html lang={locale} dir={direction}
  className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
```

### Tailwind Config Font Setup
```typescript
// tailwind.config.ts
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      display: ['var(--font-plus-jakarta)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-jetbrains-mono)', 'monospace'],
    },
    // ...
  },
}
```

### velite Case Study Collection
```typescript
// velite.config.ts
export default defineConfig({
  collections: {
    posts: { /* existing */ },
    caseStudies: {
      name: 'CaseStudy',
      pattern: 'content/case-studies/**/*.mdx',
      schema: s.object({
        title: s.string().max(100),
        slug: s.slug('case-studies'),
        date: s.isodate(),
        locale: s.string(),
        industry: s.string(),        // e.g., 'enterprise', 'infrastructure'
        client: s.string(),          // client name
        excerpt: s.excerpt(),
        cover: s.image().optional(),
        results: s.array(s.object({
          metric: s.string(),
          value: s.string(),
        })).optional(),
        content: s.mdx(),
        metadata: s.metadata(),
      }),
    },
  },
});
```

### Sticky Nav Glass Effect (D-03)
```typescript
// header.tsx — glass sticky nav
<header
  className={cn(
    'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
    scrolled
      ? 'bg-black/60 backdrop-blur-2xl border-b border-white/5'
      : 'bg-transparent',
  )}
>
```

### Noise Texture Overlay
```css
/* globals.css — fixed page-level grain texture */
.noise-overlay::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}
```

### New i18n Message Keys (Required Additions)
```json
{
  "nav": {
    "produits": "Produits",
    "solutions": "Solutions",
    "etudesDeCas": "Études de cas",
    "demo": "Démo"
  },
  "produits": {
    "heading": "Nos solutions de sécurité physique",
    "subheading": "...",
    "video": { "name": "Video Intelligence", "description": "..." },
    "accessControl": { "name": "Contrôle d'accès", "description": "..." },
    "aiAnalytics": { "name": "Analytique IA", "description": "..." },
    "analytics": { "name": "Rapports & Analytics", "description": "..." }
  },
  "solutions": {
    "heading": "Solutions par secteur",
    "subheading": "...",
    "enterprise": { "name": "Campus d'entreprise", "description": "..." },
    "critical": { "name": "Infrastructure critique", "description": "..." }
  },
  "caseStudies": {
    "heading": "Études de cas",
    "subheading": "...",
    "readMore": "Lire l'étude",
    "results": "Résultats clés",
    "empty": "Aucune étude de cas pour le moment."
  },
  "demo": {
    "heading": "Voir Oversight Hub en action",
    "subheading": "Suivez un scénario de sécurité complet...",
    "startTour": "Lancer la visite",
    "next": "Suivant",
    "previous": "Précédent",
    "step": "Étape {current} sur {total}"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IBM Plex Sans via Google Fonts @import | Inter + Plus Jakarta Sans via next/font/google | Phase 4 | Self-hosted fonts (better privacy, performance). No external CSS request. |
| Light-mode CSS variables with `darkMode: 'media'` | Dark-only theme, no media-query toggle | Phase 4 | Simpler CSS, no duplicate styles. All `dark:` prefixes become default. |
| CSS-transition AnimatedSection | motion `whileInView` with premium cubic-bezier | Phase 4 | Better performance (transform/opacity), spring physics, stagger children. |
| Static NAV_LINKS array | Data-driven nav from i18n messages | Phase 4 | Translations drive nav labels. Consistent with next-intl pattern. |
| Light header | Glass sticky nav with backdrop-blur | Phase 4 | Premium feel, follows the dark theme. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Plus Jakarta Sans supports Latin `[latin]` subset with weights 400 and 600 | Font Setup | If only 600 weight is available, use 700 for headings. Medium risk. |
| A2 | `motion` `whileInView` with `viewport: { once: true }` works without Framer Motion license | Animation | `motion` is an MIT-licensed fork. Should work identically to framer-motion for basic usage. Low risk. |
| A3 | The `caseStudies` velite collection can share the same locale-filtering pattern as `posts` | velite | Velite might have schema composition limitations. Fallback: duplicate the schema. Medium risk. |
| A4 | Tailwind CSS `start-0`/`end-0` logical properties are available in Tailwind v3 | RTL | These are Tailwind v3.3+ features. v3 should support them. Low risk. |

**If this table is empty:** All claims verified or cited — no user confirmation needed.
*(Actually: A1-A4 are [ASSUMED] and should be verified during implementation.)*

## Open Questions

1. **Demo tour mockup format**
   - What we know: D-11 says custom polished mockups. satori could generate PNGs from JSX.
   - What's unclear: Will the mockups be Figma-exported static images (PNG/WebP), or JSX components styled to look like the Dashboard? Static images are simpler to integrate but harder to make interactive.
   - Recommendation: Start with JSX placeholder components (styled divs that look like mockups) that can be replaced with real images later. This allows implementation to proceed without waiting for design assets.

2. **Case study MDX content**
   - What we know: D-13 requires 2 sample case studies. velite already handles MDX.
   - What's unclear: Where does the source content come from? Is it written during this phase or pre-existing?
   - Recommendation: Create the file structure and template, populate with realistic placeholder content that can be edited later. The CaseStudyLayout component should be designed first.

3. **OG image generation per page**
   - What we know: satori is already in the stack.
   - What's unclear: Does every new page need a unique OG image template, or can we use a generic template with page title injected?
   - Recommendation: Create a single `og-generic.tsx` template that accepts title + description. Configure in each page's `generateMetadata` with a reference to the OG endpoint. Extend later if needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | >=18 | — |
| pnpm | Package management | ✓ | 9.0.0 | — |
| next-intl | i18n routing | ✓ | 4.13.2 | — |
| motion | Animation | ✓ | 12.42.2 | — |
| velite | MDX content | ✓ | 0.4.0 | — |
| next/font | Font loading | ✓ | built-in | — |
| Tailwind CSS | Styling | ✓ | 3 | — |
| satori | OG images | ✓ | 0.28.0 | — |

**Missing dependencies with no fallback:** None — all required libraries are already in the project.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test framework detected for marketing app |
| Config file | None (no jest.config or vitest.config in apps/marketing/) |
| Quick run command | `pnpm --filter @repo/marketing build` (type-check + build) |
| Full suite command | `pnpm --filter @repo/marketing build && pnpm --filter @repo/marketing lint` |

### Phase Requirements → Test Map

Given the marketing app has no test infrastructure, validation relies on:
1. **TypeScript compilation** (`pnpm --filter @repo/marketing check-types`)
2. **Next.js build** (`pnpm --filter @repo/marketing build`) — catches broken imports, missing pages, static generation errors
3. **Manual visual verification** for each page in all 6 locales (including RTL for Arabic)
4. **Lighthouse audit** for performance (specifically checking backdrop-blur GPU impact, animation smoothness)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-01 | Build succeeds with new dark theme config | build | `pnpm --filter @repo/marketing build` | ❌ Wave 0 |
| MKT-02 | All new route pages compile and render | build | `pnpm --filter @repo/marketing build` | ❌ Wave 0 |
| MKT-03 | All 6 locale files parse as valid JSON with required keys | manual | `for f in messages/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "$f OK"; done` | ❌ Wave 0 |
| MKT-04 | Demo tour page renders with step navigation | build | `pnpm --filter @repo/marketing build` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @repo/marketing check-types`
- **Per wave merge:** `pnpm --filter @repo/marketing build`
- **Phase gate:** Full build green + manual visual verification across 3 locales (en, fr, ar) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] **No test framework** — adding one is out of scope. Validation is build + manual review.
- [ ] **No automated visual regression** — consider Percy or Chromatic, but out of scope for this phase.

## Security Domain

> `security_enforcement` is not enabled for this phase — the marketing site is a public-facing frontend with no authentication, no user data, and no backend business logic. It calls the NestJS API only for the contact form submission (existing endpoint). No ASVS compliance required for static content pages.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public site — no login |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Public content only |
| V5 Input Validation | partial | Contact form uses existing Turnstile + API validation |
| V6 Cryptography | no | No sensitive data handled |

### Security Considerations
- **Contact form:** Already uses Cloudflare Turnstile (`turnstile-types` package) and submits to NestJS API. No changes needed.
- **No user input on new pages:** Product pages, solutions, case studies, and demo tour are all static content. No forms, no data collection.
- **CSP headers:** Already handled by Caddy / Fastify Helmet. No changes needed.
- **External font loading:** Using `next/font/google` (self-hosted at build time) instead of Google Fonts @import — better privacy, no CDN requests from client.

## Sources

### Primary (HIGH confidence)
- [Codebase read: `apps/marketing/`] — Full examination of existing architecture, components, config, and messages
- [Context: `04-CONTEXT.md`] — All locked decisions (D-01 through D-19)
- [UI-SPEC: `04-UI-SPEC.md`] — Exact design tokens, component inventory, animation contract
- [Project stack: `REQUIREMENTS.md`, `ROADMAP.md`] — MKT-01 through MKT-04 requirement definitions
- [Design tokens: `packages/design/src/marketing.ts`] — Existing marketing theme to update

### Secondary (MEDIUM confidence)
- [Skill: `high-end-visual-design`] — Reference for premium design patterns (double-bezel, button-in-button, staggered reveals, performance guardrails)
- [Codebase: `.planning/codebase/STRUCTURE.md`] — Directory layout and naming conventions

### Tertiary (LOW confidence)
- (None — all major claims verified against codebase or CONTEXT.md decisions)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries verified in existing package.json and codebase
- Architecture: HIGH — Existing page patterns, component structure, i18n flow confirmed by reading actual files
- Pitfalls: MEDIUM — RTL testing gaps and velite schema composition are assumptions; CSS variable impact verified by actual variable usage in components

**Research date:** 2026-07-17
**Valid until:** 2026-08-17 (30 days — stable framework versions)
