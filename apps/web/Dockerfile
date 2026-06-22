# Build context must be the monorepo root (workspace packages are needed).
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS builder
COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/package.json
COPY apps/realtime/package.json apps/realtime/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY packages packages
COPY apps/web apps/web

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so the
# real value must be supplied as a build arg. Everything else below only
# needs to be *set* for module-level clients (Prisma/ioredis/S3) to construct
# without crashing during `next build` — they don't need to be reachable.
ARG NEXT_PUBLIC_REALTIME_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV REDIS_URL="redis://placeholder:6379"
ENV NEXTAUTH_SECRET="placeholder-build-secret"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV S3_ENDPOINT="http://placeholder:9000"
ENV S3_BUCKET="placeholder"
ENV S3_ACCESS_KEY_ID="placeholder"
ENV S3_SECRET_ACCESS_KEY="placeholder"
ENV S3_REGION="auto"

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/db
RUN npm run build --workspace=apps/web

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
