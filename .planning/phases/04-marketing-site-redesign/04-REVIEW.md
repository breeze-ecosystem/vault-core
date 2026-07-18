---
phase: 04-marketing-site-redesign
reviewed: 2026-07-17T19:20:00Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - apps/marketing/app/[locale]/layout.tsx
  - apps/marketing/app/[locale]/page.tsx
  - apps/marketing/app/[locale]/not-found.tsx
  - apps/marketing/app/[locale]/blog/page.tsx
  - apps/marketing/app/[locale]/blog/[slug]/page.tsx
  - apps/marketing/app/[locale]/pricing/page.tsx
  - apps/marketing/app/[locale]/contact/page.tsx
  - apps/marketing/app/[locale]/demo/page.tsx
  - apps/marketing/app/[locale]/produits/page.tsx
  - apps/marketing/app/[locale]/produits/video/page.tsx
  - apps/marketing/app/[locale]/produits/access-control/page.tsx
  - apps/marketing/app/[locale]/produits/ai-analytics/page.tsx
  - apps/marketing/app/[locale]/produits/analytics/page.tsx
  - apps/marketing/app/[locale]/solutions/page.tsx
  - apps/marketing/app/[locale]/solutions/enterprise-campuses/page.tsx
  - apps/marketing/app/[locale]/solutions/critical-infrastructure/page.tsx
  - apps/marketing/app/[locale]/etudes-de-cas/page.tsx
  - apps/marketing/app/[locale]/etudes-de-cas/[slug]/page.tsx
  - apps/marketing/app/sitemap.ts
  - apps/marketing/app/globals.css
  - apps/marketing/tailwind.config.ts
  - apps/marketing/velite.config.ts
  - apps/marketing/components/layout/header.tsx
  - apps/marketing/components/layout/footer.tsx
  - apps/marketing/components/layout/mobile-menu.tsx
  - apps/marketing/components/layout/section.tsx
  - apps/marketing/components/layout/container.tsx
  - apps/marketing/components/navigation/nav-link.tsx
  - apps/marketing/components/navigation/language-switcher.tsx
  - apps/marketing/components/ui/button.tsx
  - apps/marketing/components/ui/page-header.tsx
  - apps/marketing/components/ui/logo.tsx
  - apps/marketing/components/ui/animated-section.tsx
  - apps/marketing/components/landing/hero-section.tsx
  - apps/marketing/components/landing/feature-showcase.tsx
  - apps/marketing/components/landing/feature-card.tsx
  - apps/marketing/components/landing/stats-section.tsx
  - apps/marketing/components/landing/ai-grid-background.tsx
  - apps/marketing/components/landing/scroll-indicator.tsx
  - apps/marketing/components/landing/ai-highlight-section.tsx
  - apps/marketing/components/landing/testimonial-card.tsx
  - apps/marketing/components/landing/testimonial-carousel.tsx
  - apps/marketing/components/landing/cta-section.tsx
  - apps/marketing/components/landing/trust-bar.tsx
  - apps/marketing/components/shared/glass-panel.tsx
  - apps/marketing/components/shared/gradient-border.tsx
  - apps/marketing/components/shared/eyebrow-tag.tsx
  - apps/marketing/components/shared/noise-overlay.tsx
  - apps/marketing/components/shared/stats-counter.tsx
  - apps/marketing/components/products/products-hero.tsx
  - apps/marketing/components/products/product-card.tsx
  - apps/marketing/components/products/product-grid.tsx
  - apps/marketing/components/products/product-detail-layout.tsx
  - apps/marketing/components/solutions/solution-hero.tsx
  - apps/marketing/components/solutions/solution-card.tsx
  - apps/marketing/components/solutions/solution-grid.tsx
  - apps/marketing/components/solutions/solution-detail-layout.tsx
  - apps/marketing/components/case-studies/case-study-card.tsx
  - apps/marketing/components/case-studies/case-study-grid.tsx
  - apps/marketing/components/case-studies/case-study-layout.tsx
  - apps/marketing/components/blog/blog-card.tsx
  - apps/marketing/components/blog/blog-post-layout.tsx
  - apps/marketing/components/demo/demo-step.tsx
  - apps/marketing/components/demo/demo-tour.tsx
  - apps/marketing/components/pricing/pricing-card.tsx
  - apps/marketing/components/pricing/faq-section.tsx
  - apps/marketing/components/pricing/pricing-tier-data.ts
  - apps/marketing/components/contact/contact-form.tsx
  - apps/marketing/components/contact/form-field.tsx
  - apps/marketing/components/contact/turnstile-widget.tsx
  - apps/marketing/components/contact/error-message.tsx
  - apps/marketing/components/contact/success-message.tsx
  - apps/marketing/components/mdx-content.tsx
  - apps/marketing/src/lib/velite.ts
  - apps/marketing/src/lib/contact.ts
  - apps/marketing/src/lib/turnstile.ts
  - apps/marketing/src/lib/seo.tsx
  - apps/marketing/src/lib/utils.ts
  - apps/marketing/src/i18n/routing.ts
  - packages/design/src/marketing.ts
findings:
  critical: 0
  warning: 8
  info: 6
  total: 14
status: issues_found
---

# Phase 04: Marketing Site Redesign — Code Review Report

**Reviewed:** 2026-07-17T19:20:00Z
**Depth:** standard
**Files Reviewed:** 48
**Status:** issues_found

## Summary

Reviewed 48 source files across the marketing site (`apps/marketing/`) and design tokens (`packages/design/src/marketing.ts`). The codebase is generally well-structured with clean component composition, consistent use of design tokens, and proper i18n integration.

However, **8 warnings** and **6 info-level issues** were found. The most significant concerns are:

1. **`new Function()` eval-equivalent in MDX rendering** — runs arbitrary JS strings at runtime
2. **Broken CSS interactions** — `group-hover` without `group` parent, absolute positioning without `relative` container
3. **Locale-awareness gaps** — Footer links and page metadata don't respect current locale
4. **Code duplication** — Sitemap generator is ~270 lines of near-identical blocks; product detail pages are copy-pasted

No critical/blocking security vulnerabilities were identified (Turnstile CSRF protection is correctly implemented, and user inputs are properly validated before transmission).

---

## Warnings

### WR-01: `new Function()` eval-equivalent in MDX rendering

**File:** `apps/marketing/components/mdx-content.tsx:7`
**Issue:** Uses `new Function(code)` to dynamically execute compiled MDX content. This is functionally equivalent to `eval()`: it creates a function from a string of JavaScript code, executes it with access to the global scope, and returns the default export. The `code` parameter comes from `study.content` and `post.content` fields sourced from velite-compiled MDX files.

While the MDX content is developer-controlled (part of the codebase), this pattern is dangerous because:

- It bypasses Content Security Policy `script-src` restrictions (no nonce/hash check)
- Any compromised MDX file (via supply chain, git compromise, or build pipeline injection) immediately yields arbitrary JS execution in visitors' browsers
- The `eslint-disable-next-line no-new-func` comment on line 6 shows awareness of the risk

**Risk:** If an attacker gains write access to any `.mdx` file under `content/`, they can execute arbitrary JavaScript in the context of every marketing site visitor — stealing credentials, redirecting to phishing pages, or exfiltrating data.

**Fix:** Replace with a proper sandboxed MDX runtime such as `next-mdx-remote` or `@mdx-js/mdx`'s `evaluate()` which isolates component scope and controls the available imports:

```tsx
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { use } from 'react';

export function MDXContent({ code, components }: MDXContentProps) {
  const { default: Component } = use(
    useMemo(() => evaluate(code, { ...runtime, useMDXComponents: () => components }), [code])
  );
  return <Component />;
}
```

---

### WR-02: Broken `group-hover` animation — missing parent `group` class

**File:** `apps/marketing/components/products/product-card.tsx:50`
**Issue:** The arrow span at line 50 uses `group-hover:translate-x-1` to animate the "→" symbol on hover. However, none of the parent elements have a `group` class. The `<Link>` wrapper has `className="block h-full"` and `<GlassPanel>` does not add `group`. The hover animation **never triggers**.

Contrast with `solution-card.tsx:35` which correctly uses `className="group block h-full"` — this is the identical pattern, but `product-card.tsx` is missing `group`.

**Fix:** Add `group` to the `<Link>` element in `product-card.tsx`:

```tsx
<Link href={href} className="group block h-full">
```

---

### WR-03: Absolute-positioned pricing badge without `relative` container

**File:** `apps/marketing/components/pricing/pricing-card.tsx:18-20`
**Issue:** The "Most Popular" badge uses `absolute -top-3 left-1/2 -translate-x-1/2` positioning. This requires the nearest ancestor to have `position: relative` to anchor correctly.

For **highlighted tiers** (wrapped in `GradientBorder`), the badge positions relative to the `GradientBorder` which has `relative`, but the `p-px` padding creates an offset — the `-top-3` is measured from the `GradientBorder`'s top edge (which includes its 1px padding), not from the visible card top.

For **non-highlighted tiers** (wrapped in `AnimatedSection` → `GlassPanel`), neither ancestor has `position: relative`. The badge will position relative to the nearest positioned ancestor — potentially the viewport or a distant layout container — causing visual breakage.

**Fix:** Add `relative` to the `GlassPanel` container className:

```tsx
<GlassPanel hover className="relative flex flex-col p-8 h-full">
```

---

### WR-04: Footer navigation links lack locale prefix

**File:** `apps/marketing/components/layout/footer.tsx:9-14`
**Issue:** All footer links are hardcoded with absolute paths without locale prefix (e.g., `href="/produits"`, `href="/blog"`). Since `localePrefix: 'always'` is configured in `routing.ts`, the site serves content under paths like `/{locale}/produits`. Clicking an unprefixed link causes the middleware to redirect to the default locale (English), dropping the user from their current locale.

For example, a French user on `/fr/produits` who clicks "Blog" in the footer gets redirected to `/en/blog` instead of `/fr/blog`.

The `Footer` is a server component and cannot use `useLocale()`, but it could:

1. Accept `locale` as a prop from parent page components
2. Use `getLocale()` from `next-intl/server` (async)
3. Use `Link` from `next-intl/navigation` which automatically handles locale prefixing

**Fix:** Import and use locale-aware `Link`:

```tsx
import { Link } from '@/src/i18n/navigation';
```

Or rewrite each `href` to use the full locale-prefixed path:

```tsx
const locale = getLocale(); // from next-intl/server
const links = [
  { label: 'Blog', href: `/${locale}/blog` },
  // ...
];
```

---

### WR-05: Contact page uses static `metadata` (no locale awareness)

**File:** `apps/marketing/app/[locale]/contact/page.tsx:20-29`
**Issue:** The contact page exports a static `metadata: Metadata` object. This means:

1. The same title/description is served for ALL locales
2. No `alternates.canonical` or `alternates.languages` for hreflang
3. No OpenGraph locale awareness

Every other dynamic page in the project uses `generateMetadata()` with locale-aware parameters. This one was missed.

**Fix:** Replace with `generateMetadata()`:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Contact - OVERSIGHT AI',
    description: '...',
    alternates: {
      canonical: `https://oversighthub.com/${locale}/contact`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}/contact`]),
      ),
    },
    openGraph: {
      title: 'Contact - OVERSIGHT AI',
      description: '...',
      url: `https://oversighthub.com/${locale}/contact`,
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}
```

---

### WR-06: 404 page has hardcoded home link and static metadata

**File:** `apps/marketing/app/[locale]/not-found.tsx:7-9,21`
**Issue:** Same two problems as WR-05:

1. **Static metadata** (line 7) — locale-agnostic title
2. **Hardcoded `/` link** (line 21) — `<Link href="/">` always goes to English home, even for French/Japanese users

The `not-found.tsx` inside `[locale]` is a special Next.js page that doesn't receive `params`, but it can still use locale from the parent layout or middleware.

**Fix:** For the metadata, use `generateMetadata` if possible, or at minimum use a `metadata` object that doesn't hardcode the title. For the home link:

```tsx
// Use a client-side navigation workaround or add a default locale redirect
// Option: Add locale detection via headers
const headersList = await headers();
const locale = headersList.get('x-next-intl-locale') || 'en';
// Then: <Link href={`/${locale}`}>Retour à l'accueil</Link>
```

---

### WR-07: Sitemap contains massive code duplication

**File:** `apps/marketing/app/sitemap.ts:31-269`
**Issue:** The sitemap generator creates per-locale entries for 8 page types (home, pricing, blog, produits, 4 produit sub-pages, solutions, 2 solution sub-pages, case studies, demo). Each block constructs URL strings and hreflang alternates with identical logic. The alternates construction alone is duplicated 10+ times with only the path varying.

This is ~240 lines of nearly identical code. Adding a new locale or page type requires modifying multiple blocks. The duplicated `x-default` assignment is repeated 10+ times.

Additionally, the dynamic `import()` calls (lines 207, 239) inside `try/catch` blocks at request-time are an unusual pattern for a build-time sitemap — they prevent TypeScript optimization and add latency to each sitemap generation request.

**Fix:** Extract helpers to DRY up the alternates generation:

```tsx
function localeAlternates(path: string): Record<string, string> {
  const alts: Record<string, string> = {};
  for (const l of LOCALES) {
    alts[l] = `${BASE_URL}/${l}${path}`;
  }
  alts['x-default'] = `${BASE_URL}/en${path}`;
  return alts;
}

function pageEntry(locale: string, path: string, priority: number, frequency: string) {
  return {
    url: `${BASE_URL}/${locale}${path}`,
    lastModified: new Date(),
    changeFrequency: frequency,
    priority,
    alternates: { languages: localeAlternates(path) },
  };
}
```

For the velite imports, use top-level static imports instead of dynamic ones — they can still be guarded with a build-time check:

```tsx
import { getAllSlugsByLocale, getCaseStudySlugsByLocale } from '@/src/lib/velite';
// Guard at usage: if (typeof getAllSlugsByLocale === 'function') ...
```

---

### WR-08: Feature showcase uses fragile array-index i18n access pattern

**File:** `apps/marketing/components/landing/feature-showcase.tsx:26,42-45`
**Issue:** The feature cards use `cardKeys = [0, 1, 2, 3, 4, 5]` and access translations via `cards.raw(String(index))` cast to `{ title: string; description: string }`. This couples the component to both the `icons` array length (also 6) and the i18n message array structure.

Problems:
- Adding/removing a feature requires updating the `cardKeys` array, the `icons` array, the i18n messages, AND keeping indices in sync — four separate changes
- Using `raw()` with numeric strings is fragile — if the i18n structure changes from array to object, it silently breaks
- The `as { title: string; description: string }` type assertion bypasses runtime validation — if a message is missing, the component crashes when accessing `.title`
- No TypeScript error if the i18n structure doesn't match — the `raw()` return is `any`

**Fix:** Use named keys instead of numeric indices:

```tsx
const FEATURE_KEYS = [
  { key: 'unifiedCommand', icon: Shield },
  { key: 'aiInsights', icon: Brain },
  { key: 'selfHosted', icon: Server },
  // ...
] as const;

// Then in JSX:
{FEATURE_KEYS.map(({ key, icon: Icon }) => {
  const card = t.raw(key) as { title: string; description: string };
  return <FeatureCard key={key} icon={Icon} title={card.title} description={card.description} />;
})}
```

This maps to an i18n structure like:
```json
{
  "featureCards": {
    "unifiedCommand": { "title": "...", "description": "..." },
    "aiInsights": { "title": "...", "description": "..." }
  }
}
```

---

## Info

### IN-01: No fetch timeout in contact form submission

**File:** `apps/marketing/src/lib/contact.ts:19-23`
**Issue:** The `fetch()` call has no timeout or `AbortController`. If the API server hangs (network issues, overloaded server), the UI remains in "loading" state indefinitely with no feedback to the user. The contact form's submit button is disabled during loading but never re-enables.

**Suggestion:** Add a timeout using `AbortSignal.timeout()`:

```tsx
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

const res = await fetch(`${API_URL}/api/contact`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal: controller.signal,
});
clearTimeout(timeoutId);
```

---

### IN-02: Manual i18n variable replacement instead of `next-intl` interpolation

**File:** `apps/marketing/components/demo/demo-tour.tsx:153`
**Issue:** Step indicator `aria-label` uses `.replace()` for template variables:
```tsx
aria-label={`${t('step').replace('{current}', String(i + 1)).replace('{total}', String(DEMO_STEPS.length))}`}
```

The `next-intl` `t()` function supports built-in interpolation: `t('step', { current: i + 1, total: DEMO_STEPS.length })`. The manual replace approach:
1. Makes the `{current}` / `{total}` syntax a leaky contract across all locale files
2. Silently produces garbage output if a locale file uses `{{current}}` or other syntax
3. Is more code than using the built-in feature

**Suggestion:** Use the built-in interpolation:
```tsx
aria-label={t('step', { current: i + 1, total: DEMO_STEPS.length })}
```

---

### IN-03: Hardcoded French text in product card CTA

**File:** `apps/marketing/components/products/product-card.tsx:49`
**Issue:** The card's CTA label is hardcoded as "En savoir plus" (French). While the marketing site appears French-first in URL slugs (`/produits`, `/etudes-de-cas`), the pricing page, FAQ, blog dates, and multiple other components use English. This creates an inconsistent user experience for non-French locales.

**Suggestion:** Make the CTA label locale-aware via props or translation function, or consistently decide on a primary language for the marketing site.

---

### IN-04: Product detail pages have near-identical structure

**Files:** `apps/marketing/app/[locale]/produits/video/page.tsx`, `access-control/page.tsx`, `ai-analytics/page.tsx`, `analytics/page.tsx`
**Issue:** All four product detail pages follow the exact same pattern (generateStaticParams, generateMetadata, feature rendering with icons array). This is ~88 lines per file × 4 files = ~350 lines of copy-pasted code. Adding a new product requires copying another file.

**Suggestion:** Create a shared `ProductDetailPage` generic component that accepts the product namespace, metadata title/description, and feature icons array as props, reducing each page to ~30 lines:

```tsx
export default async function VideoPage(props: Props) {
  return <ProductPageTemplate namespace="produits.video" featureIcons={[Camera, Scan, Share2, Layers]} />;
}
```

---

### IN-05: Design tokens in `packages/design/src/marketing.ts` are unused by the actual implementation

**File:** `packages/design/src/marketing.ts`
**Issue:** The `marketingTheme` object defines color, spacing, and typography tokens, but none of the components in `apps/marketing/` import or reference this module. All components use raw Tailwind classes (`text-[#94a3b8]`, `bg-[#070912]`) or CSS custom properties (`hsl(var(--marketing-primary))`). The exported `MarketingTheme` type and object are dead code.

The design intent (56px display font, dark backgrounds, cyan accent) is correctly implemented, but through direct Tailwind usage rather than through the `marketingTheme` token system.

**Suggestion:** Either:
1. Remove the dead export from `packages/design/src/marketing.ts` to avoid confusion, or
2. Refactor components to reference theme tokens (e.g., `color = marketingTheme.colors.text.primary`) — though this would increase bundle size since these would be runtime values.

---

### IN-06: `velite.config.ts` suppresses all TypeScript type checking

**File:** `apps/marketing/velite.config.ts:42`
**Issue:** The config exports are cast with `as unknown as Record<string, unknown>`, effectively disabling type checking on the entire config object. This is a common velite workaround but means any misconfiguration is silent until build time.

**Suggestion:** Use a typed wrapper if velite's types improve in future versions, or add a JSDoc comment explaining why the cast is necessary and what risks it masks.

---

_Reviewed: 2026-07-17T19:20:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
