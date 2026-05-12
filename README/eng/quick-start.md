# HopperRU -- Quick Start

Get HopperRU running in 5 minutes.

---

## 3 Commands to Launch

```bash
# 1. Clone and configure
git clone git@github.com:your-org/hopperru.git && cd hopperru
cp .env.example .env        # Fill in TELEGRAM_BOT_TOKEN, YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY

# 2. Start all services
docker compose up --build -d

# 3. Apply database migrations
docker compose exec api npx prisma migrate deploy
```

---

## Health Check

```bash
# API
curl http://localhost:3000/health
# Expected response: {"status":"ok"}

# Web application
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
# Expected response: 200

# Swagger documentation
open http://localhost:3000/api/docs
```

---

## First Search via API

```bash
curl -X GET "http://localhost:3000/api/search/flights?\
origin=SVO&destination=AER&departureDate=2026-07-15" \
  -H "Content-Type: application/json"
```

The response contains a list of flights with prices, AI predictions, and available seat counts.

---

## Service Ports

| Service | URL |
|---------|-----|
| API (NestJS) | http://localhost:3000 |
| Web (Next.js) | http://localhost:3001 |
| ML (FastAPI) | http://localhost:8000 |
| Swagger Docs | http://localhost:3000/api/docs |
| Grafana | http://localhost:3100 |

---

## Full Guides

| Document | Description |
|----------|-------------|
| [Administrator Guide](./admin-guide.md) | Installation, configuration, backups, monitoring, security |
| [User Guide](./user-guide.md) | Search, booking, price freeze, financial protection |
| [API Documentation](./api-docs.md) | Endpoints, authentication, request/response formats |
