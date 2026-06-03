# syntax=docker/dockerfile:1.7
# Reputon backend — Hono + Drizzle + ioredis + minio.
# tsx runs the TS source directly; no transpile step.

FROM node:20-alpine AS deps
WORKDIR /app

# Workspace manifests so npm can resolve the full graph.
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/db/package.json packages/db/

# Install prod deps; tsx is in backend deps so it lands automatically.
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV BACKEND_PORT=8080
ENV PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY backend ./backend
COPY packages/db ./packages/db

USER node
EXPOSE 8080
CMD ["node_modules/.bin/tsx", "backend/src/index.ts"]
