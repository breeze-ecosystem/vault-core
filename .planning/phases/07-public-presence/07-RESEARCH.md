# Phase 7: Public Presence - Research

**Researched:** 2026-07-16
**Domain:** Next.js marketing site architecture, internationalization, MDX content layer, SEO, infrastructure integration
**Confidence:** HIGH

## Summary

Phase 7 adds a standalone Next.js marketing website (`apps/marketing/`) at `oversighthub.com` alongside the existing Dashboard. It covers 8 requirements (WEB-01 through WEB-08): landing page, pricing page, MDX blog (velite), 6-locale i18n (next-intl), SEO with JSON-LD, contact form with Turnstile spam protection, and design token sharing via `@repo/design`.

**Primary recommendation:** Build the marketing site as a separate Next.js 14 app in the Turborepo, using next-intl v4 for i18n (with prefix-based routing), velite v0.4 for the MDX blog, and satori for static OG images. The contact form posts to a new NestJS `ContactModule` that reuses the existing Resend integration. Add a Caddy host-based route for `oversighthub.com` → marketing service, and a new Docker multi-stage build.

**Key constraint:** Phase 5 settled on pure licensing (no Stripe/PayPal) — pricing page uses "Contact Sales" CTAs per D-01.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** License tiers with "Contact Sales" CTAs — no Stripe checkout, no invoice link. Purchase happens outside the app.
- **D-02:** Three tiers: Starter (device-limited), Professional (higher limits), Enterprise (unlimited + priority).
- **D-03:** Two primary CTAs: "Book a Demo" + "Contact Sales" — both on the pricing page and hero section.
- **D-04:** Separate Next.js 14 app at `apps/marketing/` — not a subdirectory or subdomain of the Dashboard.
- **D-05:** Marketing site lives on `oversighthub.com` (separate domain). Dashboard remains accessible at a subdomain (e.g., `app.oversighthub.com`) or subdirectory.
- **D-06:** New Dockerfile at `docker/website.Dockerfile` — multi-stage build with standalone Next.js output, independent from Dashboard's Dockerfile.
- **D-07:** Marketing site is a brand extension — same brand DNA, typography (Inter), and color palette but adapted for marketing: lighter backgrounds, larger hero imagery, more whitespace.
- **D-08:** Shared design tokens extracted to `@repo/design` package (CSS custom properties + JS constants). Consumed by both Dashboard and marketing site.
- **D-09:** CSS animations for most interactions (hovers, scroll reveals, micro-interactions). `motion` used only for hero section page transitions and showcase carousels.
- **D-10:** Build marketing-specific local components (hero, feature showcase, testimonial, pricing card, CTA sections). Do NOT extend `@repo/ui`.
- **D-11:** Subtle AI-first visual touches (animated grid background, gradient accents) — not the full dashboard aesthetic.
- **D-12:** MDX via velite — developer-authored, version-controlled. No headless CMS. Content is statically generated at build time.
- **D-13:** Blog content localization: canonical posts authored in English, professionally translated to all 6 locales. Each locale gets its own `/{locale}/blog/{slug}` URL.
- **D-14:** `next-intl` for marketing site i18n. Separate translation files from Dashboard's custom I18nProvider.
- **D-15:** Locale routing via next-intl `/fr/pricing`, `/es/pricing` prefix pattern. SEO-friendly with hreflang annotations.
- **D-16:** Full RTL layout support for Arabic via next-intl direction API.
- **D-17:** English is the primary locale for marketing content (authored first). French is secondary.
- **D-18:** Translation workflow: JSON files in `apps/marketing/messages/{locale}.json` — standard next-intl pattern. Version-controlled, managed via PRs.
- **D-19:** Contact form POSTs to a NestJS API endpoint (`POST /api/contact`) — reuses existing Resend SDK integration, audit logging, and rate limiting.
- **D-20:** Minimal form fields: Name, Email, Message, optional Company. Low friction for leads.
- **D-21:** Cloudflare Turnstile for spam protection — privacy-friendly, invisible, GDPR-compliant.
- **D-22:** Rendering strategy: SSG for landing and pricing pages (static generation at build time), ISR for blog (revalidation ~10 minutes for content freshness).
- **D-23:** Static OG images per page category (landing, pricing, blog) with page title overlay. Generated at build time.
- **D-24:** Privacy-focused analytics — Plausible or Umami (self-hosted). No Google Analytics, no cookie consent banner needed.
- **D-25:** Full JSON-LD structured data: Organization schema, SoftwareApplication schema, BlogPosting schema for posts, FAQ schema for pricing page.
- **D-26:** One sitemap per locale (sitemap-en.xml, sitemap-fr.xml, etc.) with cross-locale hreflang annotations and x-default. All blog posts × all locales included.

### The Agent's Discretion
- Exact landing page sections and layout (hero, features, trust, testimonials, CTA flow) — standard marketing/saas patterns, fit to Oversight Hub's brand.
- Blog post categories (changelog, security insights, product updates per WEB-03).
- Contact form email template design (Resend template).
- JSON-LD exact schema markup details (standard Schema.org patterns).
- Sitemap generation implementation (next-sitemap or manual generation).
- Turnstile site key env var naming convention.
- Blog MDX file structure and velite configuration.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 7 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEB-01 | Marketing landing page with product presentation, features, and hero section | Standard next-intl SSG pages; marketing-specific components per D-10; `@repo/design` tokens for branding |
| WEB-02 | Pricing page with plan comparison, feature matrix, and Contact Sales CTAs | Three-tier pricing (D-02) with no Stripe (D-01); two CTAs per D-03; FAQ schema for JSON-LD |
| WEB-03 | Blog with MDX content (velite) — changelog, security insights, product updates | velite v0.4 MDX collection; per-locale content directories; ISR revalidation at 10 min; code highlighting |
| WEB-04 | Multi-language via next-intl — French (primary), English, Spanish, German, Japanese, Arabic | next-intl v4.13 with prefix routing; `defineRouting` for 6 locales; RTL for Arabic; `setRequestLocale` for SSG |
| WEB-05 | SEO with meta tags, OG images, JSON-LD, sitemap, robots.txt | satori for OG images; next-sitemap for multi-locale sitemaps; JSON-LD in layout; per-locale metadata |
| WEB-06 | Contact/demo request form with email notification | Cloudflare Turnstile; POST to NestJS `/api/contact`; Resend email; new ContactModule |
| WEB-07 | Website shares design system with dashboard for visual consistency | `@repo/design` tokens (CSS custom properties + JS constants); marketing-adapted theme |
| WEB-08 | Responsive design across desktop, tablet, and mobile | Tailwind CSS responsive utilities; marketing-specific components; next-intl RTL handling |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Landing page rendering | Marketing site (Next.js SSG) | — | Static content, generated at build time; no backend needed |
| Pricing page rendering | Marketing site (Next.js SSG) | — | Static content with current plan data in JSON messages |
| Blog content processing | Marketing site (Next.js at build time via velite) | — | velite runs as part of build; generates type-safe content at build time |
| i18n routing / locale negotiation | Marketing site (next-intl middleware) | — | Middleware handles locale detection, redirects, hreflang headers |
| Contact form (client-side) | Marketing site (browser) | — | Turnstile widget + form submission in the browser |
| Contact form (server-side) | NestJS API (`/api/contact`) | — | Receives form data, validates Turnstile token, sends email via Resend |
| Email delivery | NestJS API (Resend SDK) | — | Reuses existing `NotificationService` infrastructure |
| Design token provision | `@repo/design` (shared package) | — | Pure TS package providing CSS custom properties + JS constants |
| SEO headers / sitemaps | Marketing site (Next.js) | — | `generateMetadata`, next-sitemap, next-intl hreflang headers |
| DNS / reverse proxy | Caddy | — | Routes `oversighthub.com` → marketing service, `app.oversighthub.com` → dashboard |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | 4.13.2 | i18n for Next.js | Industry standard; prefix-based routing, RTL, hreflang, SSG support via `setRequestLocale` |
| velite | 0.4.0 | MDX content layer | Type-safe; Zod schema validation; built-in MDX support; Next.js integration |
| satori | 0.28.0 | OG image generation | Vercel's JSX-to-SVG library; embeddable font paths; build-time generation |
| sharp | 0.35.3 | Image processing | Required by Next.js sharp for image optimization; also used by satori for PNG conversion |
| next-sitemap | 4.2.3 | Sitemap generation | Per-locale sitemaps with hreflang annotations; manual alternative at agent's discretion |
| @next/third-parties | 16.2.10 | Google Fonts / third-party loading | Performance-optimized font loading (Google Fonts) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| turnstile-types | 1.2.3 | TypeScript types for Cloudflare Turnstile | Contact form widget typing |
| rehype-pretty-code | latest | Code syntax highlighting in MDX | Blog post code blocks |
| motion | 12.42.2 | Page transitions + carousels (already in monorepo) | Hero section page transitions and showcase carousels (D-09) |
| clsx + tailwind-merge | 2.1.1 / 3.5.0 | Classname utility (already in monorepo) | `cn()` helper for Tailwind |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-intl | Dashboard's custom I18nProvider | Dashboard's provider uses React Context only — no middleware, no routing integration. next-intl handles locale negotiation, redirects, hreflang headers, RTL. |
| velite | Contentlayer (abandoned) | Contentlayer is unmaintained since 2023. velite is actively maintained with 0.4.0 released June 2026. |
| satori | @vercel/og (higher-level wrapper) | @vercel/og (v0.11.1) wraps satori for edge functions. For build-time static OG images, direct satori is simpler. |
| next-sitemap | Manual sitemap generation | next-sitemap is well-established (4 years). Manual generation is viable but more work (agent's discretion per CONTEXT.md). |

**Installation:**
```bash
pnpm add next-intl velite satori sharp next-sitemap @next/third-parties turnstile-types -D rehype-pretty-code --filter @repo/marketing
```

**Version verification:** All versions above verified via `npm view <package> version` on 2026-07-16.

## Package Legitimacy Audit

> **Gate run:** slopcheck unavailable at research time — marking all packages `[ASSUMED]`. Planner must gate each install behind `checkpoint:human-verify`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| next-intl | npm | ~4 yrs (v4: 2025-03) | 800k+/wk | github.com/amannn/next-intl | N/A | [ASSUMED] - widely used |
| velite | npm | ~2 yrs (v0.4.0: 2026-06) | growing | github.com/zce/velite | N/A | [ASSUMED] - active, used by Chakra UI |
| satori | npm | ~3 yrs | 500k+/wk | github.com/vercel/satori | N/A | [ASSUMED] - Vercel maintained |
| sharp | npm | ~8 yrs | 30M+/wk | github.com/lovell/sharp | N/A | [ASSUMED] - foundational |
| next-sitemap | npm | ~4 yrs | 300k+/wk | github.com/iamvishnusankar/next-sitemap | N/A | [ASSUMED] - widely used |
| @next/third-parties | npm | ~2 yrs | 200k+/wk | Vercel/Next.js monorepo | N/A | [ASSUMED] - official Next.js package |
| turnstile-types | npm | ~2 yrs | low | npm registry | N/A | [ASSUMED] - optional typing only |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck unavailable)
**Packages flagged as suspicious [SUS]:** none
**Human verification required:** All packages above are [ASSUMED] — planner must add `checkpoint:human-verify` before each install per the Package Legitimacy Gate protocol.

## Architecture Patterns

### Architecture Diagram

```
                  ┌──────────────────────────────────────┐
                  │           Caddy (port 80)             │
                  │  oversighthub.com / app.oversighthub  │
                  └──────┬────────────────────┬───────────┘
                         │                    │
              Host: oversighthub.com   Host: app.oversighthub.com
                         │                    │
              ┌──────────▼──────┐    ┌────────▼──────────┐
              │ apps/marketing/ │    │  apps/dashboard/  │
              │  Next.js 14     │    │  Next.js 14       │
              │  (port 3200)    │    │  (port 3100)      │
              └──┬─────────┬────┘    └────────────────────┘
                 │         │
          ┌──────▼──┐  ┌──▼───────┐
          │ velite  │  │next-intl │
          │ .velite │  │messages/ │
          │ content │  │{locale}  │
          └─────────┘  └──────────┘
                 │
                 │ POST /api/contact
                 │ (with Turnstile token)
                 ▼
          ┌──────────────────────────────────────────┐
          │       NestJS API (apps/api/)              │
          │  ContactModule → NotificationService      │
          │  (validates Turnstile → sends via Resend) │
          └──────────────────────────────────────────┘
```

### Recommended Project Structure
```
apps/marketing/
├── messages/
│   ├── en.json           # English (primary)
│   ├── fr.json           # French
│   ├── es.json           # Spanish
│   ├── de.json           # German
│   ├── ja.json           # Japanese
│   └── ar.json           # Arabic (RTL)
├── content/
│   └── blog/
│       ├── en/           # English blog posts (canonical)
│       ├── fr/           # French translations
│       ├── es/
│       ├── de/
│       ├── ja/
│       └── ar/
├── public/
│   ├── og/               # Pre-generated OG images
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx        # Locale root layout (RTL aware)
│   │   │   ├── page.tsx          # Landing page (SSG)
│   │   │   ├── pricing/page.tsx  # Pricing page (SSG)
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx      # Blog listing (ISR)
│   │   │   │   └── [slug]/page.tsx # Blog post (ISR from velite)
│   │   │   ├── contact/page.tsx  # Contact form
│   │   │   └── not-found.tsx
│   │   └── layout.tsx            # Root shell (html wrapper)
│   ├── components/
│   │   ├── hero.tsx
│   │   ├── feature-showcase.tsx
│   │   ├── pricing-card.tsx
│   │   ├── testimonial.tsx
│   │   ├── cta-section.tsx
│   │   ├── contact-form.tsx
│   │   ├── locale-switcher.tsx
│   │   ├── mdx-content.tsx       # velite MDX renderer
│   │   └── ui/                   # Marketing-specific primitives
│   │       ├── button.tsx
│   │       └── ...
│   ├── i18n/
│   │   ├── routing.ts            # defineRouting config
│   │   ├── request.ts            # getRequestConfig
│   │   └── navigation.ts         # createNavigation wrappers
│   ├── lib/
│   │   ├── utils.ts              # cn() helper
│   │   ├── velite.ts             # velite content import
│   │   ├── turnstile.ts          # Turnstile widget helper
│   │   └── contact.ts            # Contact form API client
│   └── og/
│       ├── template.tsx          # Base OG template component
│       ├── landing.tsx           # Landing OG
│       ├── pricing.tsx           # Pricing OG
│       └── blog.tsx              # Blog OG
├── tailwind.config.ts
├── next.config.ts                # With next-intl plugin + velite build hook
├── proxy.ts                      # next-intl middleware
├── velite.config.ts              # velite collection definitions
├── tsconfig.json
└── package.json                  # @repo/marketing
```

### Pattern 1: next-intl v4 Routing Setup (prefix-based, SSG)
**What:** Standard next-intl locale routing using prefix pattern `/en/about` with static rendering support via `setRequestLocale`.
**When to use:** Marketing site requires locale prefix routing for SEO (D-15, D-22)
**Source:** [VERIFIED: next-intl.dev/docs/routing/setup]

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'ja', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
```

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

```typescript
// proxy.ts (formerly middleware.ts in Next.js <16)
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
```

```typescript
// src/app/[locale]/layout.tsx (with RTL support)
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

// RTL locales mapping — Arabic needs dir="rtl"
const rtlLocales = new Set(['ar']);

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const direction = rtlLocales.has(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

```typescript
// Add generateStaticParams for SSG (landing, pricing) per D-22
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
```

**Key next-intl v4 behavioral notes:**
- `proxy.ts` replaces `middleware.ts` in Next.js 16+.
- `setRequestLocale(locale)` must be called in EVERY layout and page that needs SSG, before any `useTranslations` or `getTranslations` call.
- `hasLocale()` validates against the routing config before rendering (avoids 404 fallback).
- `getRequestConfig` is automatically discovered when at `src/i18n/request.ts`.
- The `dir` attribute on `<html>` handles RTL — no separate CSS needed.

### Pattern 2: velite MDX Blog Content Collection
**What:** velite processes MDX files from `content/blog/{locale}/` into a type-safe data layer consumed by Next.js pages.
**When to use:** All blog content — D-12, D-13
**Source:** [VERIFIED: velite.js.org/guide/with-nextjs]

```typescript
// velite.config.ts
import { defineConfig, s } from 'velite';

export default defineConfig({
  collections: {
    posts: {
      name: 'Post',
      pattern: 'content/blog/**/*.mdx',
      schema: s.object({
        title: s.string().max(120),
        slug: s.slug('posts'),
        date: s.isodate(),
        locale: s.string(), // matched from subdirectory
        category: s.string(), // "changelog" | "security" | "product-updates"
        excerpt: s.excerpt(),
        cover: s.image().optional(),
        tags: s.array(s.string()).optional(),
        content: s.mdx(), // compiled MDX
        metadata: s.metadata(), // reading time, word count
      }),
    },
  },
});
```

```typescript
// next.config.ts — velite build hook (Turbopack compatible)
import type { NextConfig } from 'next';

const isDev = process.argv.indexOf('dev') !== -1;
const isBuild = process.argv.indexOf('build') !== -1;
if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
  process.env.VELITE_STARTED = '1';
  const { build } = await import('velite');
  await build({ watch: isDev, clean: !isDev });
}

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

```typescript
// src/lib/velite.ts — typed re-export with locale filtering
import { posts as allPosts } from '../../.velite';

export function getPostsByLocale(locale: string) {
  return allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(locale: string, slug: string) {
  return allPosts.find((post) => post.locale === locale && post.slug === slug);
}

export function getAllSlugsByLocale() {
  const slugs: Record<string, string[]> = {};
  for (const post of allPosts) {
    if (!slugs[post.locale]) slugs[post.locale] = [];
    slugs[post.locale].push(post.slug);
  }
  return slugs;
}
```

```typescript
// src/components/mdx-content.tsx — velite MDX renderer
import * as runtime from 'react/jsx-runtime';

const useMDXComponent = (code: string) => {
  const fn = new Function(code);
  return fn({ ...runtime }).default;
};

interface MDXProps {
  code: string;
  components?: Record<string, React.ComponentType>;
}

export function MDXContent({ code, components }: MDXProps) {
  const Component = useMDXComponent(code);
  return <Component components={{ ...components }} />;
}
```

### Pattern 3: Static OG Image Generation with satori
**Source:** [VERIFIED: github.com/vercel/satori]

```typescript
// src/og/template.tsx
import satori from 'satori';
import sharp from 'sharp';

// Build-time OG image generation script
export async function generateOGImage({
  title,
  category,
}: {
  title: string;
  category: 'landing' | 'pricing' | 'blog';
}) {
  const interRegular = await fetch(
    'https://...inter-regular.woff'
  ).then((r) => r.arrayBuffer());

  const svg = await satori(
    <div
      style={{
        display: 'flex',
        width: 1200,
        height: 630,
        background: 'linear-gradient(135deg, #070912 0%, #06b6d4 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
      }}
    >
      <h1 style={{ color: '#fff', fontSize: 64, fontWeight: 700 }}>
        {title}
      </h1>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
      ],
    }
  );

  // Convert SVG to PNG
  const png = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return png;
}
```

**Important satori note:** Does NOT support RTL. Arabic OG images should be generated with a separate template that uses `textAlign: 'right'` or should default to English-style OG images for simplicity.

### Pattern 4: Cloudflare Turnstile + NestJS Contact Module
**Source:** [VERIFIED: developers.cloudflare.com/turnstile/get-started/]

```typescript
// Contact form client-side (apps/marketing/src/components/contact-form.tsx)
// @cloudflare/turnstile types (no npm package needed for widget)
declare const turnstile: {
  render: (element: string, options: { sitekey: string; callback: (token: string) => void }) => void;
};

export function ContactForm() {
  const [token, setToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => { document.body.removeChild(script); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, company, message, turnstileToken: token }),
    });
    // handle response...
  };

  return (
    <form onSubmit={handleSubmit}>
      <div ref={turnstileRef} className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      {/* form fields */}
    </form>
  );
}
```

```typescript
// NestJS ContactModule — new module in apps/api/src/modules/contact/
// Patterns from: [CITED: apps/api/src/modules/health/health.module.ts]

// contact.controller.ts
@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public() // Marketing site is not authenticated
  @ApiOperation({ summary: 'Submit contact/demo request' })
  async submit(@Body(new ZodValidationPipe(contactSchema)) dto: ContactDto) {
    return this.contactService.handleContact(dto);
  }
}

// contact.service.ts
export class ContactService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleContact(dto: ContactDto) {
    // 1. Verify Turnstile token server-side
    const turnstileRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: new URLSearchParams({
          secret: this.configService.get('TURNSTILE_SECRET_KEY'),
          response: dto.turnstileToken,
        }),
      }
    );
    const turnstileData = await turnstileRes.json();
    if (!turnstileData.success) {
      throw new BadRequestException('Invalid captcha');
    }

    // 2. Store in audit log / DB
    await this.prisma.contactSubmission.create({
      data: { name: dto.name, email: dto.email, company: dto.company, message: dto.message },
    });

    // 3. Send email via Resend (reuses existing notification service)
    await this.notificationService.sendEmail({
      to: this.configService.get('CONTACT_NOTIFICATION_EMAIL'),
      subject: `New Contact: ${dto.name} from ${dto.company || 'Unknown'}`,
      html: `<p>Name: ${dto.name}</p><p>Email: ${dto.email}</p><p>Message: ${dto.message}</p>`,
    });

    return { success: true };
  }
}
```

**Turnstile constraints:**
- Client-side widget loaded from `https://challenges.cloudflare.com/turnstile/v0/api.js` (async, defer)
- Server-side verification always required — `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
- Tokens expire after 300 seconds (5 minutes) — form submission must be within that window
- Testing secret keys available for development

### Anti-Patterns to Avoid
- **Do NOT mix next-intl middleware with other Next.js middleware without explicit composition** — next-intl's middleware must handle locale negotiation BEFORE other middleware. Use the `composing middlewares` pattern from next-intl docs.
- **Do NOT use `next-intl v3` with Next.js 14** — CONTEXT.md mentions next-intl, but the latest stable is v4 (published 2025-03). v4 has breaking changes: middleware file renamed to `proxy.ts`, `defineRouting` replaces manual config, `setRequestLocale` required for SSG.
- **Do NOT bundle velite content in `public/`** — velite outputs to `.velite/` directory which must be importable as a module, not a static asset.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| i18n routing/locale negotiation | Custom locale detection logic | next-intl | Handles Accept-Language parsing, cookie management, hreflang headers, redirects, RTL |
| MDX content processing | Custom MDX build pipeline | velite | Zod schemas for validation, type generation, image processing, watch mode, 60ms rebuilds |
| OG image generation | Canvas-based image rendering | satori | JSX-to-SVG with Flexbox layout; produces vector output then converts to PNG via sharp |
| Sitemap generation | Manual XML generation | next-sitemap | Auto-discovers pages, handles dynamic routes, generates per-locale sitemaps with hreflang |
| CAPTCHA/spam protection | Custom bot detection | Cloudflare Turnstile | Privacy-first, invisible, GDPR-compliant, zero Google dependency |
| Design token sharing | Config copy-paste between apps | `@repo/design` | Single source of truth: CSS custom properties + JS constants consumed by both apps |

**Key insight:** Each of these problems has well-established, actively maintained solutions. Building custom versions would add maintenance burden without differentiation value. The monorepo structure (pnpm workspaces) makes adding these packages trivial.

## Common Pitfalls

### Pitfall 1: next-intl middleware conflicts with Next.js middleware
**What goes wrong:** If `proxy.ts` (`middleware.ts`) is combined with another middleware, locale negotiation can break or the middleware may not run.
**Why it happens:** Next.js only runs the middleware file from the root. If additional middleware logic is needed, it must be composed into a single middleware function.
**How to avoid:** next-intl v4 supports middleware composition via the `composing middlewares` pattern — create one `proxy.ts` that calls `createMiddleware(routing)` and chains additional logic.
**Warning signs:** Pages not localizing, locale not detected, middleware running on wrong paths.

### Pitfall 2: velite ESM-only packaging
**What goes wrong:** `require('velite')` fails because velite is an ESM-only package.
**Why it happens:** velite explicitly states it is ESM-only. CommonJS projects cannot import it directly.
**How to avoid:** Use `await import('velite')` inside async functions (e.g., the webpack plugin or the next.config.ts build hook). Do NOT use `require()`. The `next.config.ts` hook pattern already uses dynamic import, which works in both CJS and ESM contexts.
**Warning signs:** `ERR_REQUIRE_ESM` at build time.

### Pitfall 3: Standalone Next.js output not serving static files
**What goes wrong:** Next.js standalone output separates server code from static assets, causing 404s for static files (images, OG images, favicon) in production.
**Why it happens:** The standalone output structure puts the server at the root and static assets under `apps/marketing/.next/static` and `apps/marketing/public`.
**How to avoid:** Copy both `.next/static` and `public/` into the Docker image at the correct paths (same pattern as dashboard Dockerfile).
**Reference:** `docker/dashboard.Dockerfile` lines 53-55 — copies `.next/standalone`, `.next/static`, and `public/`.

### Pitfall 4: Caddy host-based routing for marketing domain
**What goes wrong:** Caddy's host matching requires explicit configuration. Simply adding a path-based rule won't distinguish between `oversighthub.com` and `app.oversighthub.com`.
**How to avoid:** Use separate Caddy site blocks with explicit hostnames. The current Caddyfile uses `:80` which catches all traffic. Change to named sites: `oversighthub.com { ... }` and `app.oversighthub.com { ... }`.
**Reference:** [ASSUMED] — Caddy v2 site blocks used for vhost-based routing.

### Pitfall 5: next-intl locale not available for SSG
**What goes wrong:** When using `output: 'standalone'` with SSG, next-intl pages render dynamically instead of statically.
**Why it happens:** next-intl v4 uses headers internally for locale detection. Without `setRequestLocale`, the page opts into dynamic rendering.
**How to avoid:** Call `setRequestLocale(locale)` in EVERY layout and page before any next-intl API call. Add `generateStaticParams` returning all 6 locales. This is explicitly documented as the "stopgap solution" in next-intl docs.
**Source:** [VERIFIED: next-intl.dev/docs/routing/setup#static-rendering]

### Pitfall 6: Sharp version mismatch in Docker
**What goes wrong:** Next.js requires `sharp` for image optimization. If the Docker image doesn't have native bindings matching the Alpine platform, image optimization fails silently.
**Why it happens:** `sharp` depends on `libvips` native binaries which vary by platform.
**How to avoid:** Install `sharp` in the deps stage with `--ignore-scripts` then use `npm rebuild sharp` in the runner stage. Or use the `node:20-alpine` image which is the same as the dashboard Dockerfile.
**Reference:** Dashboard Dockerfile uses `node:20-alpine` which handles sharp properly.

## Code Examples

### next.config.ts (with next-intl plugin + velite build hook)
```typescript
// Source: [VERIFIED: next-intl.dev/docs/getting-started/app-router]
// [VERIFIED: velite.js.org/guide/with-nextjs]
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isDev = process.argv.indexOf('dev') !== -1;
const isBuild = process.argv.indexOf('build') !== -1;
if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
  process.env.VELITE_STARTED = '1';
  const { build } = await import('velite');
  await build({ watch: isDev, clean: !isDev });
}

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default withNextIntl(nextConfig);
```

### Locale Switcher Component (next-intl)
```typescript
// Source: [VERIFIED: next-intl.dev/docs/routing/navigation]
'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

export function LocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();

  const handleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
    >
      {routing.locales.map((locale) => (
        <option key={locale} value={locale}>
          {locale.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

### JSON-LD Structured Data (in layout)
```typescript
// Source: [ASSUMED] — standard Schema.org pattern
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Oversight AI',
    url: 'https://oversighthub.com',
    description: 'AI-powered physical security intelligence platform',
    sameAs: [
      // social profiles
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### Dockerfile for Marketing Site
```dockerfile
# Reference: [CITED: docker/dashboard.Dockerfile]
# Pattern follows same multi-stage approach

# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/design/package.json packages/design/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/marketing/package.json apps/marketing/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/design/node_modules ./packages/design/node_modules
COPY --from=deps /app/apps/marketing/node_modules ./apps/marketing/node_modules

# Build shared packages first
RUN npx tsc -p packages/shared/tsconfig.json && npx tsc -p packages/design/tsconfig.json

# Build marketing site (velite runs as part of build due to next.config.ts hook)
RUN pnpm --filter @repo/marketing build

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/marketing/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/marketing/.next/static ./apps/marketing/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/marketing/public ./apps/marketing/public

USER nextjs
EXPOSE 3200
ENV PORT=3200
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/marketing/server.js"]
```

### Caddy Configuration (with marketing host)
```caddyfile
# Reference: [CITED: Caddyfile]
oversighthub.com {
	# Marketing site
	handle {
		reverse_proxy marketing:3200
	}

	log {
		output stdout
	}
}

app.oversighthub.com {
	handle /api/* {
		reverse_proxy api:4000
	}

	handle /ws/* {
		reverse_proxy api:4000
	}

	handle {
		reverse_proxy dashboard:3100
	}

	log {
		output stdout
	}
}
```

### turbo.json Pipeline Addition
```json
// In turbo.json, add to tasks:
"marketing#build": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", ".env*"],
  "outputs": [".next/**", "!.next/cache/**", ".velite/**"]
},
"marketing#dev": {
  "cache": false,
  "persistent": true
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-intl v3 (createMiddleware in middleware.ts) | next-intl v4 (createMiddleware in proxy.ts; defineRouting) | 2025-03 (v4.0) | middleware.ts renamed to proxy.ts for Next.js 16 compat, routing config centralized in `defineRouting` |
| Contentlayer (unmaintained) | velite | 2024-2026 | velite is actively maintained with MDX support, Zod schemas, and faster rebuilds |
| @vercel/og (edge-only OG) | satori directly (build-time) | 2025+ | For static SSG, build-time OG image generation via satori avoids edge function cold starts |
| reCAPTCHA (Google dependency) | Cloudflare Turnstile (privacy-first) | 2024+ | GDPR-compliant, invisible by default, no cookie consent banner needed |

**Deprecated/outdated:**
- **Contentlayer** — [unmaintained since 2023](https://github.com/contentlayerdev/contentlayer/issues/429). Design decisions D-12/D-13 confirm velite as replacement. [VERIFIED]
- **next-intl v3** — v4 released 2025-03. The v3 docs show `middleware.ts` pattern which changed to `proxy.ts` in v4. Use v4 for new projects. [VERIFIED: npm registry]
- **reCAPTCHA** — D-21 explicitly rejects Google reCAPTCHA in favor of Cloudflare Turnstile.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | velite `s.mdx()` schema produces compiled MDX function-body string for runtime rendering | velite MDX Support | Medium — could slow down rendering if output format differs from expected |
| A2 | next-intl v4 `setRequestLocale` + `generateStaticParams` produces true static rendering (no server-side rendering at runtime for landing/pricing) | next-intl SSG Pattern | High — if SSG doesn't work, landing/pricing pages would be server-rendered per request, increasing latency |
| A3 | Caddy v2 host-based routing with explicit site blocks works for production deployment | Caddy Configuration | Low — Caddy v2 is well-documented; host-based routing is a standard feature |
| A4 | satori standalone build approach will build in Docker `node:20-alpine` (WASM compatibility) | satori OG Pattern | Medium — WASM loading in Alpine may need `yoga.wasm` file copied into Docker image |
| A5 | All 6 locales can use `generateStaticParams` without excessive build times | Architecture Pattern | Low — each locale adds ~6x build time for SSG pages, but velite blog content is per-locale filtered |
| A6 | `@next/third-parties` Google Fonts approach works with next-intl | Standard Stack | Low — Google Fonts loading is orthogonal to i18n |

## Open Questions (RESOLVED)

1. **Blog content localization strategy (D-13)** — RESOLVED
   - **Decision:** Use same slug across locales for the canonical post. Locale prefix ensures uniqueness. Translating only the content, not the URL.
   - What we know: Canonical posts in English, professionally translated to 6 locales. Each locale in `content/blog/{locale}/`.
   - What's unclear: Will translated posts share the same slug (e.g., `/en/blog/hello-world` and `/fr/blog/hello-world`) or use translated slugs?
   - Recommendation: Use same slug for consistency. The locale prefix ensures uniqueness. Translate only the content, not the URL.

2. **Analytics self-hosting: Plausible vs Umami (D-24)** — RESOLVED
   - **Decision:** Deferred to agent discretion. Plan 07-09 implements Plausible-compatible analytics script. Docker service can be added as follow-up.
   - What we know: Privacy-focused, self-hosted, no cookie consent banner.
   - What's unclear: Which is preferred? Plausible requires Postgres (already available) or ClickHouse. Umami is a single binary with SQLite/Postgres.
   - Recommendation: Defer to agent's discretion. Either can be added as a Docker service. Umami has simpler resource requirements for a marketing site (1 container, 1 DB).

3. **Contact form spam rate limiting** — RESOLVED
   - **Decision:** 5 requests per 10 minutes per IP for `/api/contact`, applied via `@fastify/rate-limit` with custom key generator.
   - What we know: Turnstile handles bot prevention. Rate limiting is mentioned (D-19 reuses existing API rate limiting).
   - What's unclear: Should the contact endpoint have a separate, stricter rate limit from the main API (which has 200/60s)?
   - Recommendation: Use a more restrictive rate limit for `/api/contact` (e.g., 5 requests per 10 minutes per IP). This can be applied via `@fastify/rate-limit` with a custom key generator.

## Environment Availability

> Phase 7 introduces no new external runtimes or services beyond the existing Docker/Compose infrastructure.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Marketing site build | ✓ | >=18 (node:20-alpine in Docker) | — |
| pnpm 9.0.0 | Monorepo install | ✓ | 9.0.0 (Corepack enforced) | — |
| Docker | Build + deployment | ✓ | per system | — |
| Cloudflare Turnstile | Contact form | ✗ (needs setup) | — | Dev-only test keys available for local dev |
| Resend (API key) | Contact form email | ✓ (already in use by invite module) | existing | — |
| Google Fonts (Inter) | Marketing site typography | ✓ (CDN) | — | Self-host in Docker if offline needed |

**Missing dependencies with no fallback:** None — all infrastructure is already present or has dev-mode alternatives.
**Missing dependencies with fallback:** Cloudflare Turnstile provides testing secret keys for local development without a real Cloudflare account.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Marketing site is public — no auth needed |
| V5 Input Validation | Yes | Zod schema validation on contact form (shared schema via `@repo/shared`) |
| V8 Data Protection | Yes | Turnstile token server-side verification; contact data stored in Prisma |
| V11 Business Logic | Yes | Rate limiting on `/api/contact` to prevent abuse |

### Known Threat Patterns for Marketing Site + NestJS

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Contact form spam/bot submission | Tampering | Cloudflare Turnstile widget + server-side Siteverify API check |
| Contact form abuse (rate limiting) | Denial of Service | `@fastify/rate-limit` on `/api/contact` endpoint with IP-based key |
| Cross-site scripting (blog MDX) | Tampering | velite MDX compilation follows React's XSS protections; no dangerouslySetInnerHTML on user content |
| Fake Turnstile tokens | Spoofing | Server-side Siteverify MUST be called — never trust client-provided `turnstileToken` without verification |
| Turnstile server-side verification timing | Spoofing | 300-second token expiry; verify BEFORE processing the submission |

## Sources

### Primary (HIGH confidence)
- [next-intl.dev/docs/routing/setup](https://next-intl.dev/docs/routing/setup) — Locale routing setup with defineRouting, proxy.ts, navigation
- [next-intl.dev/docs/routing/middleware](https://next-intl.dev/docs/routing/middleware) — Middleware composition, locale detection, matcher config
- [next-intl.dev/docs/routing/configuration](https://next-intl.dev/docs/routing/configuration) — localePrefix, pathnames, RTL, hreflang, domains
- [velite.js.org/guide/quick-start](https://velite.js.org/guide/quick-start) — Collection definition, schema, build commands
- [velite.js.org/guide/with-nextjs](https://velite.js.org/guide/with-nextjs) — Next.js integration (build hook pattern, Turbopack-compatible)
- [velite.js.org/guide/using-mdx](https://velite.js.org/guide/using-mdx) — MDX content schema, rendering patterns, component injection
- [github.com/vercel/satori](https://github.com/vercel/satori) — JSX-to-SVG documentation, CSS support matrix, font embedding
- [developers.cloudflare.com/turnstile/get-started/](https://developers.cloudflare.com/turnstile/get-started/) — Widget embedding, server-side validation, security requirements
- npm registry — All package versions verified (next-intl 4.13.2, velite 0.4.0, satori 0.28.0, sharp 0.35.3, next-sitemap 4.2.3)

### Secondary (MEDIUM confidence)
- Existing code patterns (dashboard Dockerfile, Caddyfile, turbo.json, health module, globals.css) — verified by codebase inspection
- `@repo/design` package structure — verified by reading `packages/design/src/` files

### Tertiary (LOW confidence)
- Velite MDX bundling details (A1) — not explicitly verified by example; based on velite docs documentation
- satori WASM compatibility in Alpine Docker (A4) — not explicitly tested in this environment

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry with documentation reviewed
- Architecture: HIGH — patterns based on current project structure (Caddy, Docker, turbo.json, pnpm workspace)
- Pitfalls: MEDIUM — common issues documented by official sources; Docker specifics based on existing dashboard pattern
- Security: HIGH — Turnstile and rate limiting patterns well-documented

**Research date:** 2026-07-16
**Valid until:** 2026-08-15 (30 days — next-intl and velite are fast-moving)
