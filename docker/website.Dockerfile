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

# Build marketing site
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
