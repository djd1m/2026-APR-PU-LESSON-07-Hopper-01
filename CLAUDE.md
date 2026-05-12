# HopperRU — AI-Powered Travel Booking + Fintech Protection

## Project Overview

HopperRU — российский аналог Hopper ($850M revenue), AI-powered travel booking с финтех-защитой путешественника. Telegram-first, domestic routes, MIR/SBP payments.

**One-liner:** "Booking.com + AI-предиктор цен + финтех-страховка путешественника"

## Architecture

- **Pattern:** Distributed Monolith (Monorepo)
- **Backend:** NestJS (TypeScript)
- **Frontend:** Next.js + React
- **Telegram Bot:** telegraf.js
- **ML Service:** FastAPI (Python) + scikit-learn → TensorFlow
- **Database:** PostgreSQL + Redis (cache) + ClickHouse (analytics)
- **Payments:** YooKassa (MIR, SBP, QR)
- **Infrastructure:** Docker Compose on VPS (Selectel/Yandex Cloud)
- **Data Residency:** Russia (152-ФЗ compliance)

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| API | NestJS | TypeScript, modular, fast startup |
| Web | Next.js 15 | SSR, React, good DX |
| Bot | telegraf.js | Telegram-native, 90M RU users |
| ML | FastAPI + sklearn | Rule-based Phase 1, ML Phase 2 |
| DB | PostgreSQL 16 | Relational, JSONB, reliable |
| Cache | Redis 7 | Price cache, sessions, rate limiting |
| Analytics | ClickHouse | Time-series price data, fast aggregation |
| Queue | BullMQ (Redis) | Background jobs, alerts, notifications |
| Payments | YooKassa | MIR/SBP mandatory in Russia (ADR-4) |
| Deploy | Docker Compose | Simple VPS deploy via SSH |
| CI/CD | GitHub Actions | Build, test, deploy |

## Monorepo Structure

```
hopperru/
├── packages/
│   ├── api/          # NestJS backend
│   ├── web/          # Next.js frontend
│   ├── bot/          # Telegram bot (telegraf.js)
│   ├── ml/           # Python ML service
│   ├── shared/       # Shared types, utils
│   └── db/           # Prisma schema, migrations
├── docs/             # SPARC documentation
├── .claude/          # Claude Code toolkit
├── docker-compose.yml
├── Dockerfile
└── turbo.json        # Turborepo config
```

## Parallel Execution Strategy

- Use `Task` tool for independent subtasks
- Run tests, linting, type-checking in parallel
- For complex features: spawn specialized agents
- Database migrations: sequential only
- API + Bot + Web can be developed in parallel (shared types via packages/shared)

## Core Algorithms

1. **PricePredictionEngine** — Rule-based (Phase 1) → ML (Phase 2), see `docs/Pseudocode.md`
2. **PriceFreezeManager** — Freeze/unfreeze/settle lifecycle
3. **ProtectionBundleCalculator** — CFAR, PriceDrop, Disruption pricing
4. **BookingOrchestrator** — Search → Predict → Freeze → Book → Protect

## Feature Lifecycle

Use `/feature <name>` for features touching 4+ files:
1. **PLAN** — SPARC mini docs in `docs/features/<name>/`
2. **VALIDATE** — INVEST/SMART scoring
3. **IMPLEMENT** — Parallel agents
4. **REVIEW** — brutal-honesty-review

Use `/plan <name>` for smaller changes (≤3 files).

## Key Business Rules

- Price Freeze: max 21 days, fee ₽2,000-3,000, non-refundable unless flight sold out
- CFAR: 100% refund, must cancel 24h+ before departure, requires insurance partner
- Price Drop Protection: 10-day monitoring, auto-refund difference
- Max 10 active price alerts per user
- Prediction confidence <50% → show "Недостаточно данных" (no recommendation)
- All payments via YooKassa (MIR, SBP) — no Visa/MC in Russia

## Available Commands

| Command | Purpose |
|---------|---------|
| `/start` | Bootstrap project from SPARC docs |
| `/feature <name>` | Full feature lifecycle (4 phases) |
| `/plan <name>` | Quick implementation plan |
| `/go <name>` | Smart router: /plan or /feature based on complexity |
| `/run [mvp\|all]` | Autonomous build loop |
| `/next` | Next feature from roadmap |
| `/deploy [env]` | Deploy to dev/staging/prod |
| `/docs [lang]` | Generate bilingual docs |
| `/myinsights` | Capture development insight |
| `/harvest` | Extract reusable knowledge |

## Available Agents

### Pre-shipped (pipeline)
- `replicate-coordinator` — Pipeline orchestration
- `product-discoverer` — Market research
- `doc-validator` — Documentation validation
- `harvest-coordinator` — Knowledge extraction

### Project-specific
- `planner` — Feature planning with HopperRU algorithms
- `code-reviewer` — Quality review (fintech edge cases)
- `architect` — System design decisions

## Key Risks

1. **Insurance partner** — CFAR requires licensed insurer (ЦБ regulation)
2. **Price prediction accuracy** — Cold start: rule-based 70%, needs data to improve
3. **Yandex competition** — May copy fintech features within 6-12 months
4. **152-ФЗ** — Tightening data localization from 01.07.2025
5. **Digital Ruble** — Mandatory integration by 09.2026

## Development Insights

See `.claude/insights/index.md` for captured "грабли" and solutions.
Auto-injected on SessionStart via hook.
