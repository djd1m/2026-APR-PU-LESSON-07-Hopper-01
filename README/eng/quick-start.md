# HopperRU -- Quick Start

Get HopperRU running in 5 minutes.

---

## 3 Commands to Launch

```bash
# 1. Clone and configure
git clone git@github.com:your-org/hopperru.git && cd hopperru
cp .env.example .env        # Fill in YOOKASSA_SHOP_ID (1357789), YOOKASSA_SECRET_KEY, AMADEUS_API_KEY, SMSC_LOGIN/SMSC_PASSWORD

# 2. Start all services
docker compose up --build -d

# 3. Apply database migrations
docker compose exec api npx prisma migrate deploy
```

---

## Health Check

```bash
# API
curl http://localhost:7101/health
# Expected response: {"status":"ok"}

# Web application (Next.js PWA)
curl -s -o /dev/null -w "%{http_code}" http://localhost:7100
# Expected response: 200

# Swagger documentation
open http://localhost:7101/api/docs
```

---

## First Search via API

```bash
curl -X GET "http://localhost:7101/api/search/flights?\
origin=SVO&destination=AER&departureDate=2026-07-15" \
  -H "Content-Type: application/json"
```

The response contains a list of flights with prices, AI predictions, and available seat counts.

---

## Service Ports

| Service | URL |
|---------|-----|
| Web (Next.js PWA) | http://localhost:7100 |
| API (NestJS) | http://localhost:7101 |
| ML (FastAPI) | http://localhost:9102 |
| Swagger Docs | http://localhost:7101/api/docs |
| Grafana | http://localhost:3100 |

> **Note:** Ports 7100-7101 are chosen to avoid conflicts on shared VPS (port 9100 is blocked externally). ML service is available on port 9102.

---

## Current Project Status

- **65+ commits**, 250+ files
- **Web-first + PWA** -- primary interface (ADR-6: Telegram blocked in Russia since April 2026)
- **YooKassa** -- real payments in test mode (shopId=1357789)
- **Travelpayouts** -- real flight price data integrated
- **Amadeus API** -- integration added (credentials required)
- **Nemo.travel BookingProvider** -- ready (contract required)
- **SMSC.ru** -- real SMS delivery working
- Per-feature documentation: `docs/features/`
- 8 research documents: `docs/research/`

---

## Full Guides

| Document | Description |
|----------|-------------|
| [Administrator Guide](./admin-guide.md) | Installation, configuration, backups, monitoring, security |
| [User Guide](./user-guide.md) | Search, booking, price freeze, financial protection |
| [API Documentation](./api-docs.md) | Endpoints, authentication, request/response formats |
