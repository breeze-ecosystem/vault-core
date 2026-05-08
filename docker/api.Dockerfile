# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache openssl
WORKDIR /app

# Force development to get ALL deps (including prisma, typescript, etc.)
ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Copy source files
COPY . .

# Restore node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/eslint-config/node_modules ./packages/eslint-config/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Build shared package first
RUN npx tsc -p packages/shared/tsconfig.json

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build API
RUN cd apps/api && npx nest build

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl openssl-dev ffmpeg
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy everything we need from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

EXPOSE 4000

# Entrypoint script: migrate DB → seed → start app
COPY <<'EOF' /app/apps/api/docker-entrypoint.sh
#!/bin/sh
set -e

echo "📦 Running database migration..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push

echo "🌱 Running database seed..."
npx prisma db seed

echo "🚀 Starting API server..."
exec node dist/src/main.js
EOF
RUN chmod +x /app/apps/api/docker-entrypoint.sh

CMD ["/app/apps/api/docker-entrypoint.sh"]
