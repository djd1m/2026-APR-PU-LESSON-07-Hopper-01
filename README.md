# HopperRU

AI-powered travel booking platform with fintech protection for the Russian market. HopperRU predicts optimal ticket purchase timing, freezes prices for up to 21 days, and offers full refund protection on any cancellation -- Web-first with PWA mobile experience, Telegram bot (optional, for VPN users), and VK Mini App for social distribution. Built on the Hopper model ($850M revenue, 70%+ from fintech products), adapted for Russian infrastructure: MIR/SBP payments via YooKassa, 152-FZ data compliance, and domestic airline coverage.

## Quick Start

```bash
git clone git@github.com:your-org/hopperru.git && cd hopperru
cp .env.example .env                  # Configure environment variables
docker compose up --build             # Start all services
```

The API is available at `http://localhost:3000`, the web app at `http://localhost:3001`, and Swagger docs at `http://localhost:3000/api/docs`.

## Architecture

```
                    +-------------------+
                    |    Clients              |
                    |  Web+PWA  TgBot*  VK    |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   API Gateway     |
                    |   (NestJS)        |
                    |   Auth, Rate      |
                    |   Limiting, BFF   |
                    +--------+----------+
                             |
         +-------------------+-------------------+
         |           |           |               |
   +-----v----+ +---v-----+ +--v-------+ +-----v--------+
   | Search   | | Booking | | Fintech  | | Notification |
   | Service  | | Service | | Service  | | Service      |
   +-----+----+ +---+-----+ +--+-------+ +--------------+
         |           |           |
   +-----v----+ +---v-----+ +--v-------+
   | Airline  | | YooKassa| | Insurance|
   | APIs     | | Payment | | Partner  |
   +----------+ +---------+ +----------+

   +----------+ +---------+ +----------+
   |PostgreSQL| |  Redis  | |ClickHouse|
   | Primary  | | Cache + | | Analytics|
   | Store    | | Queues  | |          |
   +----------+ +---------+ +----------+

   +----------+
   | ML Svc   |
   | FastAPI  |
   | Price    |
   | Predict  |
   +----------+
```

Pattern: **Distributed Monolith** in a monorepo. All services deployed as Docker containers via Docker Compose.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend API | NestJS (TypeScript) | REST API, business logic, auth |
| Frontend | Next.js 15 (React) | SSR web application |
| PWA | Service Worker + Web Push | Offline support, push notifications, home screen install |
| Telegram Bot | telegraf.js | Optional booking interface (VPN users) |
| VK Mini App | VK Mini Apps SDK | Social distribution (100M+ RU users) |
| ML Service | FastAPI (Python) + scikit-learn | Price prediction engine |
| Primary DB | PostgreSQL 16 | Relational data, JSONB, transactions |
| Cache | Redis 7 | Search cache, sessions, rate limiting |
| Analytics DB | ClickHouse | Time-series price data, ML training |
| Job Queue | BullMQ (Redis) | Background jobs, notifications |
| Payments | YooKassa | MIR, SBP, QR payments |
| ORM | Prisma | Type-safe database access, migrations |
| Monorepo | Turborepo | Build orchestration, caching |
| Deploy | Docker Compose | Container orchestration on VPS |
| CI/CD | GitHub Actions | Build, test, deploy pipeline |

## Project Structure

```
hopperru/
├── packages/
│   ├── api/                 # NestJS backend
│   │   └── src/
│   │       ├── modules/     # Domain modules (user, search, booking, fintech, ...)
│   │       ├── common/      # Shared filters, guards, interceptors
│   │       └── config/      # Environment configuration
│   ├── web/                 # Next.js frontend
│   │   └── src/
│   │       ├── app/         # App Router pages
│   │       └── components/  # React components
│   ├── bot/                 # Telegram bot (telegraf.js)
│   │   └── src/
│   │       ├── commands/    # Bot commands (/search, /book, /freeze, ...)
│   │       └── scenes/      # Conversational flows
│   ├── ml/                  # Python ML service
│   │   └── src/
│   │       ├── models/      # Prediction models
│   │       └── features/    # Feature engineering
│   ├── shared/              # Shared TypeScript types, utils, DTOs
│   └── db/                  # Prisma schema, migrations, seed
├── docs/                    # SPARC documentation
│   ├── PRD.md
│   ├── Specification.md
│   ├── Architecture.md
│   ├── Pseudocode.md
│   └── Refinement.md
├── .claude/                 # Claude Code toolkit
│   ├── agents/              # AI agents (planner, reviewer, architect)
│   ├── commands/            # Slash commands (/feature, /plan, /deploy, ...)
│   ├── rules/               # Coding rules (security, style, testing)
│   ├── skills/              # Domain skills (project-context, coding-standards)
│   └── settings.json        # Hooks configuration
├── docker-compose.yml
├── Dockerfile
├── turbo.json
├── CLAUDE.md                # AI assistant project context
├── DEVELOPMENT_GUIDE.md     # Developer setup and workflow guide
└── README.md                # This file
```

## Development

### Prerequisites

- Node.js 20 LTS
- Python 3.11+
- Docker 24+ and Docker Compose 2.20+
- pnpm 9+

### Setup

```bash
pnpm install                           # Install dependencies
cp .env.example .env                   # Create environment file
docker compose up -d postgres redis    # Start infrastructure
cd packages/db && npx prisma migrate dev  # Run migrations
```

### Development Servers

```bash
pnpm --filter api dev                  # API at :3000
pnpm --filter web dev                  # Web at :3001
pnpm --filter bot dev                  # Telegram bot
cd packages/ml && uvicorn src.main:app --reload  # ML at :8000
```

Or start everything:

```bash
docker compose up --build
```

### Common Commands

| Command | Purpose |
|---------|---------|
| `pnpm lint` | Run ESLint + Prettier |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run unit tests |
| `pnpm test:integration` | Run integration tests (Docker required) |
| `pnpm test:e2e` | Run E2E tests (full stack required) |
| `pnpm test:ci` | Full CI test suite |
| `cd packages/db && npx prisma studio` | Visual database browser |
| `cd packages/db && npx prisma migrate dev` | Create and apply migration |

## Deployment

### Staging

```bash
pnpm deploy:staging
```

### Production

```bash
pnpm deploy:prod
```

Both environments run on Russian-hosted VPS (Selectel/Yandex Cloud) for 152-FZ compliance. Docker Compose handles container orchestration. GitHub Actions automates the CI/CD pipeline: build, test, deploy.

### Environment Requirements

- VPS with Docker 24+ installed
- PostgreSQL 16 with 152-FZ compliant hosting
- Redis 7 for caching and job queues
- ClickHouse for analytics (optional for MVP)
- Domain with SSL certificate (Let's Encrypt)
- YooKassa merchant account (for payments)
- Telegram bot registered via @BotFather (optional, for VPN users)

## Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| Flight Search | Multi-provider search with caching | MVP |
| AI Price Prediction | Rule-based (70%) then ML (85%+) | MVP |
| Price Calendar | Color-coded calendar of cheapest dates | MVP |
| Price Alerts | Telegram notifications on price drops | MVP |
| Price Freeze | Lock current price for 21 days | MVP |
| Flight Booking | End-to-end booking with MIR/SBP | MVP |
| Cancel For Any Reason | 100% refund via insurance partner | MVP |
| Price Drop Protection | Auto-refund if price drops after booking | v1.0 |
| PWA Mobile | Offline support, push, home screen install | MVP |
| Web Push | Browser push notifications for alerts | MVP |
| Telegram Bot | Full booking flow in Telegram (optional) | v1.0 |
| VK Mini App | Social distribution via VK | v1.0 |
| B2B SDK | White-label for banks/fintechs | v2.0 |

## Contributing

1. Create a feature branch: `git checkout -b feature/<name>`
2. Follow coding conventions in `.claude/rules/coding-style.md`
3. Write tests (80% unit coverage target)
4. Run checks: `pnpm lint && pnpm typecheck && pnpm test`
5. Create a pull request with a clear description
6. Address review feedback

### Commit Convention

```
feat(search): add flexible date search
fix(payment): handle SBP timeout correctly
docs(api): update booking endpoint descriptions
test(freeze): add expiry race condition test
```

See `.claude/rules/git-workflow.md` for full commit guidelines.

## License

Proprietary. All rights reserved.
