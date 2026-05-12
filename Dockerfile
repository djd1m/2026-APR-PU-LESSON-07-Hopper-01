# ══════════════════════════════════════════════════════════════
# HopperRU — Multi-stage Dockerfile
# Targets: api, web, bot, ml
# ══════════════════════════════════════════════════════════════

# ─── Base: Node.js ───────────────────────────────────────────
FROM node:20-alpine AS node-base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─── Dependencies ────────────────────────────────────────────
FROM node-base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY packages/bot/package.json packages/bot/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

# ─── Builder (TypeScript) ───────────────────────────────────
FROM node-base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/*/node_modules
COPY . .
RUN pnpm run build

# ─── API (NestJS) ───────────────────────────────────────────
FROM node-base AS api
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/db ./packages/db
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "packages/api/dist/main.js"]

# ─── Web (Next.js) ──────────────────────────────────────────
FROM node-base AS web
COPY --from=builder /app/packages/web/.next ./packages/web/.next
COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=builder /app/packages/web/package.json ./packages/web/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:3000 || exit 1
CMD ["node", "packages/web/.next/standalone/server.js"]

# ─── Bot (telegraf.js) ──────────────────────────────────────
FROM node-base AS bot
COPY --from=builder /app/packages/bot/dist ./packages/bot/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/bot/node_modules ./packages/bot/node_modules
CMD ["node", "packages/bot/dist/main.js"]

# ─── ML (Python/FastAPI) ────────────────────────────────────
FROM python:3.12-slim AS ml
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY packages/ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/ml/ .
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
