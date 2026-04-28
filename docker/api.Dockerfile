# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache openssl
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache openssl
WORKDIR /app

# Copy source files first (node_modules excluded by .dockerignore)
COPY . .

# Now restore node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Build shared package first (needed by API)
RUN npx tsc -p packages/shared/tsconfig.json

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build API
RUN cd apps/api && npx nest build

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl openssl-dev
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy root node_modules (contains .pnpm store)
COPY --from=builder /app/node_modules ./node_modules
# Copy API node_modules (contains symlinks into .pnpm store)
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
# Copy shared node_modules (contains symlinks for zod etc.)
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
# Copy shared package (compiled)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
# Copy API compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["sh", "-c", "/app/node_modules/.pnpm/node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
