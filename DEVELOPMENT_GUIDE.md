# HopperRU Development Guide

Step-by-step guide for developing, testing, and deploying HopperRU.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Backend + Frontend + Bot |
| Python | 3.11+ | ML Service |
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| pnpm | 9+ | Package manager (monorepo) |
| Git | 2.40+ | Version control |

## Getting Started

### 1. Clone and Install

```bash
git clone git@github.com:your-org/hopperru.git
cd hopperru
pnpm install
```

### 2. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Generate JWT keys
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# Generate encryption master key
openssl rand -hex 32
# Paste the output into .env as ENCRYPTION_MASTER_KEY

# Edit .env with your local settings:
# - DATABASE_URL (auto-configured if using Docker)
# - TELEGRAM_BOT_TOKEN (get from @BotFather)
# - YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY (from YooKassa dashboard)
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL, Redis, ClickHouse via Docker Compose
docker compose up -d postgres redis clickhouse

# Wait for services to be healthy
docker compose ps
```

### 4. Database Setup

```bash
# Generate Prisma client
cd packages/db
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed test data (development only)
npx prisma db seed
```

### 5. Start Development Servers

```bash
# Terminal 1: API server (NestJS)
pnpm --filter api dev

# Terminal 2: Web app (Next.js)
pnpm --filter web dev

# Terminal 3: Telegram bot
pnpm --filter bot dev

# Terminal 4: ML service
cd packages/ml
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Terminal 5: BullMQ worker
pnpm --filter worker dev
```

Or start everything with Docker:

```bash
docker compose up --build
```

## Development Workflow

### Branch Strategy

```
main                          # Production-ready, protected
feature/<id>-<slug>           # Feature branches
hotfix/<slug>                 # Emergency fixes
```

### Standard Flow

1. **Create a branch:**
   ```bash
   git checkout -b feature/search-flights
   ```

2. **Implement the change:**
   - Follow coding conventions in `.claude/rules/coding-style.md`
   - Write tests alongside code (not after)
   - Commit after each logical unit of work

3. **Run checks locally:**
   ```bash
   pnpm lint                    # ESLint + Prettier check
   pnpm typecheck               # TypeScript compilation
   pnpm test                    # Unit tests
   pnpm test:integration        # Integration tests (requires Docker)
   ```

4. **Push and create PR:**
   ```bash
   git push origin HEAD
   gh pr create --title "feat(search): flight search with airline API integration"
   ```

5. **Address review feedback, merge to main.**

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`, `ci`

Examples:
```
feat(search): add flight search with multi-provider aggregation
fix(payment): handle YooKassa webhook retry idempotency
docs(api): add OpenAPI descriptions for booking endpoints
test(freeze): add expiry edge case tests
```

## Docker Development Mode

### Full Stack

```bash
# Build and start all services
docker compose up --build

# Rebuild a single service
docker compose up --build api

# View logs
docker compose logs -f api

# Stop everything
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

### Service URLs (Development)

| Service | URL | Notes |
|---------|-----|-------|
| API | http://localhost:3000 | NestJS backend |
| API Docs (Swagger) | http://localhost:3000/api/docs | Auto-generated |
| Web | http://localhost:3001 | Next.js frontend |
| ML | http://localhost:8000 | FastAPI + Swagger at /docs |
| PostgreSQL | localhost:5432 | User: hopperru, DB: hopperru_dev |
| Redis | localhost:6379 | No auth in dev |
| ClickHouse | localhost:8123 | HTTP interface |
| BullMQ Dashboard | http://localhost:3000/admin/queues | Bull Board UI |

### Hot Reload

All development servers support hot reload:
- **API (NestJS):** File changes trigger automatic restart via `ts-node-dev`
- **Web (Next.js):** Fast Refresh for React components
- **Bot (telegraf):** Restart on file change via `ts-node-dev`
- **ML (FastAPI):** `--reload` flag for uvicorn

## Database Migrations (Prisma)

### Creating a Migration

```bash
cd packages/db

# After modifying schema.prisma:
npx prisma migrate dev --name add_price_alerts_table

# This will:
# 1. Generate SQL migration file
# 2. Apply it to your local database
# 3. Regenerate Prisma client
```

### Migration Rules

- One migration per logical change (not per deploy)
- Never edit existing migration files
- Always test against both fresh and populated databases
- Include both `up` and `down` (Prisma handles this automatically)
- Run `npx prisma generate` after every schema change

### Common Commands

```bash
npx prisma migrate dev              # Create and apply migration
npx prisma migrate reset            # Reset database (WARNING: deletes data)
npx prisma migrate deploy           # Apply pending migrations (production)
npx prisma db seed                  # Run seed script
npx prisma studio                   # Open visual database browser
npx prisma format                   # Format schema file
```

### Viewing the Database

```bash
# Prisma Studio (visual browser)
npx prisma studio

# Or via psql
docker compose exec postgres psql -U hopperru -d hopperru_dev
```

## Testing Commands

### Unit Tests

```bash
# All packages
pnpm test

# Specific package
pnpm --filter api test
pnpm --filter web test
pnpm --filter bot test

# Watch mode (during development)
pnpm --filter api test -- --watch

# With coverage
pnpm --filter api test -- --coverage

# Single test file
pnpm --filter api test -- booking.service.spec.ts
```

### Integration Tests

```bash
# Requires Docker (starts Testcontainers automatically)
pnpm test:integration

# Specific module
pnpm --filter api test:integration -- --testPathPattern=booking
```

### E2E Tests

```bash
# Requires full stack running (docker compose up)
pnpm test:e2e

# With headed browser (for debugging)
pnpm --filter web test:e2e -- --headed

# Specific journey
pnpm --filter web test:e2e -- search-to-booking
```

### ML Tests

```bash
cd packages/ml
pytest                              # All tests
pytest --cov=src                    # With coverage
pytest tests/test_prediction.py     # Specific file
pytest -k "test_rule_based"         # Pattern match
```

### CI Test Suite

```bash
# Runs everything that CI runs
pnpm test:ci
# Equivalent to: lint + typecheck + unit tests + integration tests + coverage check
```

## Deployment

### Staging

```bash
# Deploy to staging VPS via SSH
pnpm deploy:staging

# Or manually:
ssh staging "cd /opt/hopperru && git pull && docker compose up -d --build"
```

### Production

```bash
# Deploy to production (requires approval)
pnpm deploy:prod

# Steps:
# 1. Build production Docker images
# 2. Run migrations on production database
# 3. Rolling restart of containers
# 4. Health check verification
# 5. Rollback if health checks fail
```

### Environment-Specific Configs

| Environment | Database | Redis | Domain |
|-------------|----------|-------|--------|
| Development | localhost:5432 | localhost:6379 | localhost:3000 |
| Staging | staging-db.internal:5432 | staging-redis.internal:6379 | staging.hopperru.ru |
| Production | prod-db.internal:5432 | prod-redis.internal:6379 | hopperru.ru |

### Rollback

```bash
# Rollback to previous version
docker compose down
git checkout <previous-tag>
docker compose up -d --build

# Rollback database migration (if needed)
cd packages/db
npx prisma migrate resolve --rolled-back <migration-name>
```

## Feature Lifecycle with Claude Code

### Quick Changes (1-3 files)

```
/plan <feature-name>
```

Produces a quick implementation plan without full SPARC documentation.

### Full Features (4+ files)

```
/feature <feature-name>
```

Runs the 4-phase pipeline:
1. **PLAN** -- Generates SPARC mini-docs in `docs/features/<name>/`
2. **VALIDATE** -- Scores requirements (INVEST/SMART), flags gaps
3. **IMPLEMENT** -- Parallel implementation with tests
4. **REVIEW** -- Brutal honesty code review

### Other Commands

| Command | Use When |
|---------|----------|
| `/go <name>` | Let Claude decide: /plan or /feature based on complexity |
| `/run mvp` | Build the entire MVP autonomously |
| `/next` | Pick the next feature from the roadmap |
| `/deploy staging` | Deploy to staging environment |
| `/docs` | Generate/update documentation |
| `/myinsights "..."` | Capture a development insight |
| `/harvest` | Extract reusable knowledge from codebase |

## Debugging Tips

### API Debugging

```bash
# View API logs with request details
docker compose logs -f api | grep -E "(ERROR|WARN|req:)"

# Test an endpoint manually
curl -s http://localhost:3000/api/v1/health | jq

# Test authenticated endpoint
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/dev-login | jq -r '.data.accessToken')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/users/me | jq
```

### Database Debugging

```bash
# Check active connections
docker compose exec postgres psql -U hopperru -c "SELECT * FROM pg_stat_activity WHERE datname='hopperru_dev'"

# Slow queries (if pg_stat_statements enabled)
docker compose exec postgres psql -U hopperru -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10"

# Check table sizes
docker compose exec postgres psql -U hopperru -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC"
```

### Redis Debugging

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# Check memory usage
docker compose exec redis redis-cli INFO memory

# Monitor commands in real-time
docker compose exec redis redis-cli MONITOR

# Check specific key
docker compose exec redis redis-cli GET "search:SVO:AER:2026-07-15:abc123"
```

### Telegram Bot Debugging

```bash
# View bot logs
docker compose logs -f bot

# Test webhook manually (if using webhook mode)
curl -X POST http://localhost:3000/api/v1/webhooks/telegram \
  -H "Content-Type: application/json" \
  -d '{"update_id": 1, "message": {"text": "/start", "chat": {"id": 123}}}'

# Check bot status
curl https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo | jq
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` on database | PostgreSQL not started | `docker compose up -d postgres` |
| Prisma client out of date | Schema changed without generate | `npx prisma generate` |
| JWT validation fails | Keys not configured | Check `JWT_PUBLIC_KEY` in `.env` |
| Bot not responding | Token wrong or webhook conflict | Verify `TELEGRAM_BOT_TOKEN`, check for competing instances |
| Redis connection timeout | Redis not started or wrong URL | `docker compose up -d redis`, check `REDIS_URL` |
| ClickHouse query timeout | Missing table or wrong schema | Run ClickHouse migration scripts |
