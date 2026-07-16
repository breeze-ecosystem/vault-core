# Phase 7: Public Presence - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 20 new + 4 modified = 24 total
**Analogs found:** 22 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/marketing/package.json` | config | — | `apps/dashboard/package.json` | role-match |
| `apps/marketing/tsconfig.json` | config | — | `apps/dashboard/tsconfig.json` | role-match |
| `apps/marketing/next.config.ts` | config | — | `apps/dashboard/next.config.js` | role-match |
| `apps/marketing/tailwind.config.ts` | config | — | `apps/dashboard/tailwind.config.ts` | exact |
| `apps/marketing/proxy.ts` | middleware | request-response | `apps/dashboard/lib/i18n/` (conceptual) | partial |
| `apps/marketing/velite.config.ts` | config | — | No analog (new tech: velite) | none |
| `apps/marketing/app/globals.css` | config | — | `apps/dashboard/app/globals.css` | exact |
| `apps/marketing/app/layout.tsx` | component | static | `apps/dashboard/app/layout.tsx` | role-match |
| `apps/marketing/app/[locale]/layout.tsx` | component | static | `apps/dashboard/app/layout.tsx` | role-match |
| `apps/marketing/app/[locale]/page.tsx` | component | SSG | `apps/dashboard/app/(dashboard)/page.tsx` | partial |
| `apps/marketing/app/[locale]/pricing/page.tsx` | component | SSG | Dashboard static page pattern | partial |
| `apps/marketing/app/[locale]/blog/page.tsx` | component | ISR | No analog (MDX blog) | none |
| `apps/marketing/app/[locale]/blog/[slug]/page.tsx` | component | ISR | No analog (velite) | none |
| `apps/marketing/app/[locale]/contact/page.tsx` | component | request-response | Dashboard contact-form pattern | partial |
| `apps/marketing/app/[locale]/not-found.tsx` | component | static | Dashboard 404 analog | partial |
| `apps/marketing/components/hero.tsx` | component | static | Dashboard component pattern | partial |
| `apps/marketing/components/feature-showcase.tsx` | component | static | Dashboard component pattern | partial |
| `apps/marketing/components/pricing-card.tsx` | component | static | Dashboard card pattern | partial |
| `apps/marketing/components/testimonial.tsx` | component | static | Dashboard component pattern | partial |
| `apps/marketing/components/cta-section.tsx` | component | static | Dashboard component pattern | partial |
| `apps/marketing/components/contact-form.tsx` | component | request-response | Dashboard form pattern | partial |
| `apps/marketing/components/locale-switcher.tsx` | component | interactive | `apps/dashboard/components/language-switcher.tsx` | role-match |
| `apps/marketing/components/mdx-content.tsx` | component | static | No analog (velite MDX) | none |
| `apps/marketing/components/ui/button.tsx` | component | static | `apps/dashboard/components/ui/button.tsx` | role-match |
| `apps/marketing/components/ui/card.tsx` | component | static | `apps/dashboard/components/ui/card.tsx` | role-match |
| `apps/marketing/src/i18n/routing.ts` | config | — | `apps/dashboard/lib/i18n/context.ts` | partial |
| `apps/marketing/src/i18n/request.ts` | config | — | `apps/dashboard/lib/i18n/context.ts` | partial |
| `apps/marketing/src/i18n/navigation.ts` | config | — | `apps/dashboard/lib/i18n/context.ts` | partial |
| `apps/marketing/src/lib/utils.ts` | utility | — | `apps/dashboard/lib/utils.ts` | exact |
| `apps/marketing/src/lib/velite.ts` | utility | transform | No analog (new tech) | none |
| `apps/marketing/src/lib/turnstile.ts` | utility | — | No analog (new pattern) | none |
| `apps/marketing/src/lib/contact.ts` | utility | request-response | Dashboard API client pattern | partial |
| `apps/marketing/messages/{locale}.json` | config | — | `apps/dashboard/lib/i18n/` dictionaries | role-match |
| `apps/marketing/content/blog/{locale}/*.mdx` | content | static | No analog (new pattern) | none |
| `docker/website.Dockerfile` | config | — | `docker/dashboard.Dockerfile` | exact |
| `packages/design/src/marketing.ts` | config | — | `packages/design/src/colors.ts` | exact |
| `apps/api/src/modules/contact/contact.module.ts` | module | request-response | `apps/api/src/modules/health/health.module.ts` | role-match |
| `apps/api/src/modules/contact/contact.controller.ts` | controller | request-response | `apps/api/src/modules/health/health.controller.ts` | role-match |
| `apps/api/src/modules/contact/contact.service.ts` | service | request-response | `apps/api/src/modules/notification/notification.service.ts` | partial |
| `packages/shared/src/schemas/contact.schema.ts` | schema | request-response | `packages/shared/src/schemas/invite.schema.ts` | exact |
| **Modified:** `Caddyfile` | config | route | Current Caddyfile | exact |
| **Modified:** `docker-compose.yml` | config | — | Current docker-compose.yml | exact |
| **Modified:** `turbo.json` | config | — | Current turbo.json (dashboard entry) | exact |
| **Modified:** `pnpm-workspace.yaml` | config | — | Current pnpm-workspace.yaml | exact |

---

## Pattern Assignments

### `apps/marketing/next.config.ts` (config)

**Analog:** `apps/dashboard/next.config.js` — lines 1-6

**Imports and Config pattern:**
```javascript
// apps/dashboard/next.config.js (lines 1-6)
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};
module.exports = nextConfig;
```

**Marketing version adds next-intl plugin + velite build hook:**
```typescript
// apps/marketing/next.config.ts — custom pattern from RESEARCH.md
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

---

### `apps/marketing/tailwind.config.ts` (config)

**Analog:** `apps/dashboard/tailwind.config.ts` — lines 1-89

**Full Tailwind config pattern (copy structure, adapt content):**
```typescript
// apps/dashboard/tailwind.config.ts (lines 1-15, 86-89)
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      // colors mapped to CSS vars (see globals.css analog)
      colors: {
        background: "hsl(var(--shadcn-background))",
        foreground: "hsl(var(--shadcn-foreground))",
        // ... full color map
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

**Key differences for marketing site:** Use lighter color palette (light theme), larger hero spacing, marketing-specific animations (scroll-reveal, micro-interactions per D-09). Reference `@repo/design` tokens instead of `--shadcn-*` CSS vars.

---

### `apps/marketing/app/globals.css` (config)

**Analog:** `apps/dashboard/app/globals.css` — lines 1-185

**CSS custom properties and utility classes pattern:**
```css
/* apps/dashboard/app/globals.css (lines 1-7, 9-40, 64-77, 84-90) */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

@layer base {
  :root {
    /* Light theme custom properties — marketing site uses light-first approach */
    --shadcn-background: 0 0% 100%;
    --shadcn-foreground: 228 20% 4%;
    --shadcn-primary: 190 90% 40%;
    --shadcn-primary-foreground: 0 0% 100%;
    --shadcn-border: 220 20% 88%;
    --shadcn-ring: 190 90% 40%;
    --shadcn-radius: 0.625rem;
    /* ... more vars */
  }

  * { @apply border-border; }
  html { scroll-behavior: smooth; }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Animated grid background — adapt for marketing's subtle AI-first touch */
  .bg-grid {
    background-image: 
      linear-gradient(hsl(var(--shadcn-primary) / 0.03) 1px, transparent 1px),
      linear-gradient(90deg, hsl(var(--shadcn-primary) / 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
}
```

**Key differences for marketing:** Import Inter font (not IBM Plex Sans), light-first theme, no scan-line or glass-premium effects per D-11, add marketing-specific animations.

---

### `apps/marketing/app/layout.tsx` (root shell component)

**Analog:** `apps/dashboard/app/layout.tsx` — lines 1-62

**Root layout pattern (HTML shell, providers, metadata):**
```typescript
// apps/dashboard/app/layout.tsx (lines 1-31, 33-61)
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme-provider";

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "OVERSIGHT AI",
  description: "Système de surveillance vidéo intelligent",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>{/* apple meta */}</head>
      <body>
        <ThemeProvider><I18nProvider>{children}</I18nProvider></ThemeProvider>
      </body>
    </html>
  );
}
```

**Marketing locale root layout uses next-intl pattern (from RESEARCH.md lines 294-335):**
```typescript
// apps/marketing/app/[locale]/layout.tsx — custom next-intl pattern
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const rtlLocales = new Set(['ar']);

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
```

---

### `apps/marketing/components/locale-switcher.tsx` (component, interactive)

**Analog:** `apps/dashboard/components/language-switcher.tsx` — lines 1-43

**Client component with i18n switching:**
```typescript
// apps/dashboard/components/language-switcher.tsx (lines 1-43)
"use client";

import { useTranslation, type Locale } from "@/lib/i18n/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const localeLabels: Record<Locale, { label: string; flag: string }> = {
  fr: { label: "Français", flag: "🇫🇷" },
  en: { label: "English", flag: "🇬🇧" },
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const current = localeLabels[locale];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-sm">
          <span>{current.flag}</span>
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(localeLabels) as Locale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={loc === locale ? "bg-accent" : ""}
          >
            <span className="mr-2">{localeLabels[loc].flag}</span>
            {localeLabels[loc].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Marketing version uses next-intl hooks (from RESEARCH.md lines 688-718):**
```typescript
// apps/marketing/components/locale-switcher.tsx — custom next-intl pattern
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
    <select value={currentLocale} onChange={(e) => handleChange(e.target.value)}>
      {routing.locales.map((locale) => (
        <option key={locale} value={locale}>{locale.toUpperCase()}</option>
      ))}
    </select>
  );
}
```

---

### `apps/marketing/src/lib/utils.ts` (utility)

**Analog:** `apps/dashboard/lib/utils.ts` — lines 1-6

**cn() helper (exact copy, same pattern):**
```typescript
// apps/dashboard/lib/utils.ts (lines 1-6)
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### `docker/website.Dockerfile` (config)

**Analog:** `docker/dashboard.Dockerfile` — lines 1-64

**Multi-stage Docker build pattern (exact match, adapt paths):**
```dockerfile
# docker/dashboard.Dockerfile (lines 1-64) — copy structure, replace app name + port

# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=development
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/design/package.json packages/design/
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
RUN npx tsc -p packages/shared/tsconfig.json
RUN npx tsc -p packages/design/tsconfig.json
# Build marketing site (velite runs as part of build via next.config.ts hook)
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

**Key difference:** Port 3200 (not 3100), adds `packages/design/` to deps/builder, no `packages/ui/` or `packages/eslint-config/` needed.

---

### `Caddyfile` (modified, config)

**Analog:** Current `Caddyfile` — lines 1-20

**Current simple catch-all routing:**
```caddyfile
# Current Caddyfile (lines 1-20) — :80 catches all traffic
:80 {
	handle /api/* { reverse_proxy api:4000 }
	handle /ws/* { reverse_proxy api:4000 }
	handle { reverse_proxy dashboard:3100 }
	log { output stdout }
}
```

**Modified version adds host-based routing (from RESEARCH.md lines 804-834):**
```caddyfile
# Modified Caddyfile with host-based routing — RESEARCH.md pattern
oversighthub.com {
	handle { reverse_proxy marketing:3200 }
	log { output stdout }
}

app.oversighthub.com {
	handle /api/* { reverse_proxy api:4000 }
	handle /ws/* { reverse_proxy api:4000 }
	handle { reverse_proxy dashboard:3100 }
	log { output stdout }
}
```

---

### `docker-compose.yml` (modified, config)

**Analog:** Current `docker-compose.yml` — lines 1-100

**Existing service pattern (dashboard service, lines 47-63):**
```yaml
# docker-compose.yml (lines 47-63) — reference for marketing service definition
dashboard:
  build:
    context: .
    dockerfile: docker/dashboard.Dockerfile
  container_name: oversight-dashboard
  restart: unless-stopped
  environment:
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}
    NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-OVERSIGHT AI}
    PORT: 3100
    NODE_ENV: production
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3100/ || exit 1"]
    interval: 15s
    timeout: 5s
    retries: 3
    start_period: 30s
```

**Marketing service follows same pattern with port 3200 and additional env vars:**
```yaml
marketing:
  build:
    context: .
    dockerfile: docker/website.Dockerfile
  container_name: oversight-marketing
  restart: unless-stopped
  environment:
    PORT: 3200
    NODE_ENV: production
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: ${TURNSTILE_SITE_KEY:-1x00000000000000000000AA}
    NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-OVERSIGHT AI}
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3200/ || exit 1"]
    interval: 15s
    timeout: 5s
    retries: 3
    start_period: 30s
```

---

### `turbo.json` (modified, config)

**Analog:** Current `turbo.json` — lines 1-27

**Current task pipeline (lines 4-26, add marketing entries):**
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build": { "dependsOn": ["^build"], "inputs": ["$TURBO_DEFAULT$", ".env*"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "lint": { "dependsOn": ["^lint"] },
    "check-types": { "dependsOn": ["^check-types"] },
    "dev": { "cache": false, "persistent": true },
    "prisma:generate": { "cache": false },
    "prisma:migrate": { "cache": false },
    "marketing#build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", ".velite/**"]
    },
    "marketing#dev": { "cache": false, "persistent": true },
    "marketing#lint": { "dependsOn": ["^lint"] },
    "marketing#check-types": { "dependsOn": ["^check-types"] }
  }
}
```

---

### `pnpm-workspace.yaml` (modified, config)

**Analog:** Current `pnpm-workspace.yaml` — line 1-4

```yaml
# Current (lines 1-4) — already includes apps/* which covers apps/marketing/
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
```

**No change needed** — the existing glob `apps/*` automatically includes `apps/marketing/`.

---

### `apps/api/src/modules/contact/contact.module.ts` (module)

**Analog:** `apps/api/src/modules/health/health.module.ts` — lines 1-9

**Lightweight module without service (for simple endpoint):**
```typescript
// apps/api/src/modules/health/health.module.ts (lines 1-9)
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

**Contact module will have a service since it needs injection:**
```typescript
// ContactModule — follows health.module.ts pattern + exports
import { Module } from "@nestjs/common";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
```

---

### `apps/api/src/modules/contact/contact.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/modules/health/health.controller.ts` — lines 1-24

**Public endpoint with Swagger + Zod validation (from RESEARCH.md lines 544-556):**
```typescript
// apps/api/src/modules/health/health.controller.ts (lines 1-24) — @Public(), @ApiTags, @ApiOperation
import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
// ...

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: "Simple health check" })
  async health() {
    return { status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" };
  }
}
```

**Contact controller pattern (from RESEARCH.md lines 544-556):**
```typescript
// ContactController — follows health controller pattern with POST body
@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()  // Marketing site is not authenticated
  @ApiOperation({ summary: 'Submit contact/demo request' })
  async submit(@Body(new ZodValidationPipe(contactSchema)) dto: ContactDto) {
    return this.contactService.handleContact(dto);
  }
}
```

---

### `apps/api/src/modules/contact/contact.service.ts` (service, request-response)

**Analog:** `apps/api/src/modules/notification/notification.service.ts` — lines 1-50

**Service pattern with dependency injection, ConfigService, external HTTP calls (from RESEARCH.md lines 559-597):**
```typescript
// apps/api/src/modules/notification/notification.service.ts (lines 25-50) — DI pattern
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleContact(dto: ContactDto) {
    // 1. Verify Turnstile token server-side
    const turnstileRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: new URLSearchParams({
        secret: this.configService.get('TURNSTILE_SECRET_KEY'),
        response: dto.turnstileToken,
      })}
    );
    const turnstileData = await turnstileRes.json();
    if (!turnstileData.success) {
      throw new BadRequestException('Invalid captcha');
    }

    // 2. Store in audit log
    await this.prisma.contactSubmission.create({
      data: { name, email, company, message },
    });

    // 3. Send email via Resend (reuses existing notification service)
    await this.notificationService.sendEmail({
      to: this.configService.get('CONTACT_NOTIFICATION_EMAIL'),
      subject: `New Contact: ${dto.name}`,
      html: `<p>Name: ${dto.name}</p><p>Email: ${dto.email}</p>`,
    });

    return { success: true };
  }
}
```

**Key imports for `BadRequestException`:**
```typescript
// Standard NestJS exception import
import { BadRequestException } from "@nestjs/common";
```

---

### `packages/shared/src/schemas/contact.schema.ts` (schema)

**Analog:** `packages/shared/src/schemas/invite.schema.ts` — lines 1-16

**Zod schema pattern with exports:**
```typescript
// packages/shared/src/schemas/invite.schema.ts (lines 1-16) — copy pattern
import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
```

**Contact schema (new, follows same pattern):**
```typescript
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  company: z.string().max(200).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  turnstileToken: z.string().min(1, "Captcha verification required"),
});

export type ContactInput = z.infer<typeof contactSchema>;
```

---

### `packages/design/src/marketing.ts` (config, design tokens)

**Analog:** `packages/design/src/colors.ts` — lines 1-35

**Design tokens pattern (JS constants):**
```typescript
// packages/design/src/colors.ts (lines 1-35) — copy structure for marketing theme
export const colors = {
  dark: {
    bg: "#070912",
    surface: "#0c1020",
    // ...
  },
  light: {
    bg: "#ffffff",
    surface: "#f5f7fa",
    // ...
  },
  shared: {
    primary: "#06b6d4",
    primaryDark: "#0891b2",
    success: "#10b981",
    // ...
  },
} as const;
```

**Marketing-specific design tokens extend the pattern:**
```typescript
// packages/design/src/marketing.ts — adapt color palette for lighter marketing aesthetic
export const marketingTheme = {
  colors: {
    hero: {
      bg: "from-cyan-950 via-blue-950 to-slate-950",
      gradient: "linear-gradient(135deg, #070912 0%, #06b6d4 100%)",
    },
    surface: {
      card: "#ffffff",
      cardHover: "#f8fafc",
      muted: "#f1f5f9",
    },
    text: {
      primary: "#070912",
      secondary: "#5c6573",
      muted: "#94a3b8",
      inverted: "#ffffff",
    },
    accent: {
      primary: "#06b6d4",
      primaryDark: "#0891b2",
      success: "#10b981",
      warning: "#f59e0b",
    },
  },
  spacing: {
    section: "py-24 md:py-32",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  },
} as const;
```

---

### `packages/design/src/index.ts` (modified, barrel export)

**Analog:** `packages/design/src/index.ts` — lines 1-4

**Barrel export pattern — add marketing:**
```typescript
// packages/design/src/index.ts (lines 1-4) — append marketing export
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./shadows";
export * from "./marketing";
```

---

### `packages/design/package.json` (modified)

**Analog:** `packages/design/package.json` — lines 1-21

```json
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
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "5.9.2"
  }
}
```

**No changes needed** — just ensure new `marketing.ts` is compiled via existing `tsc` script.

---

## Shared Patterns

### Authentication (@Public decorator for contact endpoint)
**Source:** `apps/api/src/common/decorators/public.decorator.ts` — line 4
**Apply to:** ContactController (unauthenticated POST endpoint)

```typescript
// apps/api/src/common/decorators/public.decorator.ts (line 4)
import { SetMetadata } from "@nestjs/common";
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Usage in controller:**
```typescript
@Post()
@Public()  // Bypasses JWT guard — marketing site is unauthenticated
async submit(@Body(...) dto: ContactDto) { ... }
```

---

### API Client Pattern (Contact Form)
**Source:** `apps/dashboard/lib/api.ts` — lines 1-6, 119-139
**Apply to:** `apps/marketing/src/lib/contact.ts`

```typescript
// apps/dashboard/lib/api.ts (lines 1-6, 126-139)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function register(data: { /* ... */ }) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Registration failed");
  return result;
}
```

**Contact form API client:**
```typescript
// apps/marketing/src/lib/contact.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function submitContact(data: {
  name: string;
  email: string;
  company?: string;
  message: string;
  turnstileToken: string;
}) {
  const res = await fetch(`${API_URL}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Submission failed");
  return result;
}
```

---

### Error Handling (NestJS)
**Source:** `apps/api/src/common/filters/all-exceptions.filter.ts`
**Apply to:** ContactController (standardized error responses)

The global `AllExceptionsFilter` automatically wraps all uncaught errors in `StandardErrorResponse`. Contact service can throw NestJS built-in exceptions:
```typescript
// Standard NestJS exceptions
import { BadRequestException, InternalServerErrorException } from "@nestjs/common";

// Example usage in contact service
if (!turnstileData.success) {
  throw new BadRequestException('Invalid captcha');
}
```

---

### Validation (Zod Schema + NestJS Pipe)
**Source:** `apps/api/src/common/pipes/zod-validation.pipe.ts`
**Apply to:** ContactController (request body validation)

**Shared schema pattern:**
```typescript
// packages/shared/src/schemas/contact.schema.ts
export const contactSchema = z.object({ ... });
```

**Controller usage:**
```typescript
@Body(new ZodValidationPipe(contactSchema)) dto: ContactDto
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/marketing/velite.config.ts` | config | — | velite is new technology — no existing analog in codebase |
| `apps/marketing/app/[locale]/blog/page.tsx` | component | ISR | MDX blog with velite — no existing blog in project |
| `apps/marketing/app/[locale]/blog/[slug]/page.tsx` | component | ISR | Dynamic blog post with velite MDX rendering — no analog |
| `apps/marketing/components/mdx-content.tsx` | component | static | velite MDX renderer — new pattern for the project |
| `apps/marketing/src/lib/velite.ts` | utility | transform | velite content helper — new pattern |
| `apps/marketing/src/lib/turnstile.ts` | utility | — | Cloudflare Turnstile widget — new integration |
| `apps/marketing/messages/{locale}.json` | config | — | next-intl translation files — format differs from Dashboard's TS-based i18n |
| `apps/marketing/content/blog/{locale}/*.mdx` | content | static | MDX blog content — new file format |
| `apps/marketing/src/i18n/routing.ts` | config | — | next-intl specific config — no analog (dashboard uses custom I18nProvider) |
| `apps/marketing/src/i18n/request.ts` | config | — | next-intl request config — no analog |
| `apps/marketing/src/i18n/navigation.ts` | config | — | next-intl navigation helpers — no analog |
| `apps/marketing/src/og/*.tsx` | component | static | satori OG image templates — no analog |
| `apps/marketing/app/[locale]/contact/page.tsx` | component | request-response | Contact form with Turnstile — no analog (new integration) |
| `apps/marketing/proxy.ts` | middleware | request-response | next-intl middleware — no analog in Dashboard |

For these files, use RESEARCH.md patterns (Sections: "Pattern 1: next-intl v4 Routing", "Pattern 2: velite MDX", "Pattern 3: Static OG Image Generation", "Pattern 4: Cloudflare Turnstile + NestJS Contact Module") as the primary reference.

---

## Metadata

**Analog search scope:**
- `apps/dashboard/` — Next.js app structure, layout, pages, components, config, i18n
- `apps/api/src/modules/health/` — Lightweight public endpoint module
- `apps/api/src/modules/notification/` — Service with ConfigService + external HTTP calls
- `docker/dashboard.Dockerfile` — Multi-stage Next.js Docker build
- `packages/shared/src/schemas/` — Zod schema patterns and barrel exports
- `packages/design/src/` — Design token package structure
- `Caddyfile`, `docker-compose.yml`, `turbo.json` — Infrastructure config files

**Files scanned:** ~30 (across 8 directories)

**Pattern extraction date:** 2026-07-16
