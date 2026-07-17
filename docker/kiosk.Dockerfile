# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/ packages/typescript-config/
COPY apps/kiosk/package.json apps/kiosk/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build Next.js SPA ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

ENV NODE_ENV=production

COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/kiosk/node_modules ./apps/kiosk/node_modules
# packages/typescript-config has no node_modules (it's just json configs)
# but we ensure the base.json it extends is accessible
COPY --from=deps /app/packages/typescript-config/ ./packages/typescript-config/

# Build shared package (kiosk depends on @repo/shared)
RUN npx tsc -p packages/shared/tsconfig.json

# Build kiosk SPA
RUN pnpm --filter @repo/kiosk build

# ── Stage 3: nginx + CUPS ──
FROM alpine:3.19 AS runner
RUN apk add --no-cache nginx cups cups-libs cups-filters curl

# Copy static export
COPY --from=builder /app/apps/kiosk/out/ /usr/share/nginx/html/

# Copy nginx config
COPY docker/kiosk.nginx.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY docker/kiosk-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
