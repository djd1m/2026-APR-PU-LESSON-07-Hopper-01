# ══════════════════════════════════════════════════════════════
# HopperRU — Multi-stage Dockerfile (fixed paths)
# ══════════════════════════════════════════════════════════════

# ─── API (NestJS) ───────────────────────────────────────────
FROM node:20-alpine AS api
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/api/package.json packages/api/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/db/ packages/db/
COPY packages/api/ packages/api/
RUN pnpm --filter @hopperru/db run build
RUN pnpm --filter @hopperru/shared run build
RUN pnpm --filter @hopperru/api run build
EXPOSE 3000
CMD ["node", "packages/api/dist/main.js"]

# ─── Web (Next.js) ──────────────────────────────────────────
FROM node:20-alpine AS web
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/web/package.json packages/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/
RUN pnpm --filter @hopperru/shared run build
RUN pnpm --filter @hopperru/web run build
EXPOSE 3000
CMD ["node", "packages/web/node_modules/.bin/next", "start", "-p", "3000"]

# ─── Bot (telegraf.js) ──────────────────────────────────────
FROM node:20-alpine AS bot
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/bot/package.json packages/bot/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/bot/ packages/bot/
RUN pnpm --filter @hopperru/shared run build
RUN pnpm --filter @hopperru/bot run build
CMD ["node", "packages/bot/dist/main.js"]

# ─── ML (Python/FastAPI) ────────────────────────────────────
FROM python:3.12-slim AS ml
WORKDIR /app
COPY packages/ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/ml/ .
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
