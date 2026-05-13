# Toolkit Harvest: HopperRU
**Date:** 2026-05-12 | **Mode:** Full | **Extractor:** knowledge-extractor

---

## Extracted Artifacts

### 1. Patterns

#### P1: Travel Fintech OTA Pattern
**Category:** Architecture Pattern
**Maturity:** beta
**Description:** OTA (Online Travel Agency) that generates primary revenue from fintech protection products rather than booking commissions. Applicable to any marketplace where price volatility creates anxiety.

**Pattern:**
```
Revenue Model = Commission (baseline, low margin) + Fintech Products (high margin, 50%+)
Fintech Products:
  - Price Freeze: lock current price for fee (like options contract)
  - Cancel For Any Reason: full refund insurance
  - Price Drop Protection: post-purchase price monitoring + auto-refund
Core Insight: sell financial protection, not tickets
```

**Source:** Hopper ($850M revenue, 70%+ from fintech) → HopperRU adaptation

---

#### P2: Telegram-First Distribution Pattern
**Category:** Growth Pattern
**Maturity:** experimental
**Description:** Use Telegram as primary distribution channel instead of native mobile app. Applicable to Russian market (90M+ Telegram users) and other Telegram-dominant markets.

**Pattern:**
```
Channel 1: Telegram Bot (NL search, inline results, Telegram Payments)
Channel 2: Telegram Mini App (rich UI for calendar, dashboard)
Channel 3: Web App (SEO landing, full features)
Distribution: Viral sharing in Telegram chats (savings screenshots)
Result: 10x cheaper acquisition vs native app ($50-100 CAC vs $1-6 CPI)
```

**Source:** ADR-2, HopperRU Phase 0 Discovery

---

#### P3: Cold Start ML with TRIZ Dynamism
**Category:** ML Engineering Pattern
**Maturity:** beta
**Description:** Solve ML cold start problem with phased approach: rule-based → classical ML → deep learning. Each phase is independently deployable.

**Pattern:**
```
Phase 1 (Day 1): Rule-based with domain heuristics
  - Seasonal factors, day-of-week, advance purchase curves
  - 60-70% accuracy, zero training data needed
Phase 2 (3-6 months): Classical ML (gradient boosting)
  - Train on accumulated Phase 1 data
  - 80-85% accuracy, 50K+ data points
Phase 3 (12+ months): Deep Learning (LSTM/Transformer)
  - Train on large dataset
  - 90%+ accuracy, 1M+ data points
TRIZ Principle: #15 Dynamism — system adapts its capability over time
```

**Source:** ADR-3, packages/ml/models/predictor.py

---

#### P4: YooKassa Payment Integration Pattern
**Category:** Payment Pattern
**Maturity:** production
**Description:** End-to-end payment flow using YooKassa as payment gateway for Russian market. Handles MIR/SBP payments with webhook-based confirmation. Applicable to any Russian e-commerce product.

**Pattern:**
```
Flow: Create Payment → Redirect to YooKassa → User Pays → Webhook Callback → Confirm Booking
Steps:
  1. POST /v3/payments (create payment with metadata: bookingId, type)
  2. Receive confirmation_url → redirect user
  3. User completes payment on YooKassa side (MIR/SBP/QR)
  4. YooKassa sends webhook (payment.succeeded / payment.canceled)
  5. Verify webhook signature → update booking status
  6. For pending bookings: re-fetch payment_url from API (not stored in DB)
Key: idempotent webhook processing, 30-min booking expiry, shopId in env
```

**Source:** packages/api/src/payment/, YooKassa integration (shopId=1357789, test mode)

---

#### P5: Multi-Provider Search Pattern
**Category:** Integration Pattern
**Maturity:** beta
**Description:** Cascading search across multiple flight data providers with automatic fallback. Ensures availability even when primary providers are down or unconfigured.

**Pattern:**
```
Strategy: Cascade with fallback
  Provider 1: Amadeus Flight Offers API (if AMADEUS_API_KEY configured)
    - Real-time availability, GDS data
    - Requires API credentials (paid)
  Provider 2: Travelpayouts Data API (if TRAVELPAYOUTS_TOKEN configured)
    - Best price per route (1 result), supplemented with estimated flights
    - Free tier available, real price data
  Provider 3: Mock Provider (always available)
    - Generates realistic flights based on route/date patterns
    - Used for development and as ultimate fallback
Selection: First provider that returns results wins
Timeout: Per-provider timeout (10s default), total search timeout (30s)
```

**Source:** packages/api/src/search/, docs/features/real-flight-prices/

---

#### P6: BookingProvider Abstraction Pattern
**Category:** Architecture Pattern
**Maturity:** beta
**Description:** Abstract booking provider behind interface + factory pattern to support multiple GDS/OTA backends. Environment variable switches active provider without code changes.

**Pattern:**
```
Interface: BookingProvider
  - searchFlights(query): Flight[]
  - getFlightDetails(id): FlightDetails
  - createBooking(flight, passengers): Booking
  - confirmBooking(bookingId, paymentId): Confirmation

Factory: BookingProviderFactory
  - create(provider: 'nemo' | 'amadeus' | 'mock'): BookingProvider
  - Provider selected via BOOKING_PROVIDER env var

Implementations:
  - NemoTravelProvider (needs contract)
  - AmadeusProvider (needs credentials)
  - MockProvider (always available, development)

Switch: BOOKING_PROVIDER=nemo|amadeus|mock in .env
```

**Source:** packages/api/src/booking/, docs/features/booking-provider/

---

### 2. Rules

#### R1: Russian Data Compliance Template
**Category:** Security Rule
**Applicable to:** Any project handling Russian user data

```markdown
# Russian Data Compliance (152-ФЗ)

## Mandatory
- [ ] All personal data stored on servers physically in Russia
- [ ] Roskomnadzor registration for personal data processing
- [ ] Privacy policy in Russian with 152-ФЗ required sections
- [ ] Data export mechanism for users (within 24 hours)
- [ ] Soft-delete (not hard-delete) for audit trail
- [ ] Consent collection with specific purposes listed

## Payment (MIR/SBP)
- [ ] YooKassa or equivalent (no Stripe — sanctions)
- [ ] MIR card support mandatory
- [ ] SBP (fast payments via QR) support
- [ ] Digital Ruble readiness by 09/2026

## Hosting
- [ ] Selectel, Yandex Cloud, or local VPS (not AWS/GCP/Azure)
```

---

#### R2: Fintech Product Validation Checklist
**Category:** Business Rule
**Applicable to:** Any fintech protection product

```markdown
# Fintech Product Validation

## Before Launch
- [ ] Insurance partner contract (if product transfers risk)
- [ ] ЦБ licensing check (is this insurance?)
- [ ] Terms of service reviewed by lawyer
- [ ] Actuarial model validates profitability at scale
- [ ] Edge cases documented (expiry, sold-out, double-claim)
- [ ] Refund SLA defined and testable

## Product-Specific
- Price Freeze: max duration, max coverage amount, refund on sold-out
- CFAR: cutoff time before departure, refund processing time
- Price Drop: monitoring period, minimum drop for refund, auto vs manual
```

---

#### R3: VPS Port Management
**Category:** Infrastructure Rule
**Applicable to:** Any project deployed on shared VPS

```markdown
# VPS Port Management

## Rules
- [ ] Never use well-known ports (80, 443) directly — use Nginx reverse proxy
- [ ] Avoid ports commonly blocked by hosting providers (9100 often blocked externally)
- [ ] Use dedicated port ranges per service type:
  - 7100-7199: Web frontends
  - 7200-7299: API backends (or 7101 for single API)
  - 9100-9199: ML/analytics services
  - 3100-3199: Monitoring (Grafana, Prometheus)
- [ ] Document all port assignments in .env.example
- [ ] Check port availability before deployment: `lsof -i :<port>`
- [ ] Use Docker Compose port mapping to remap internal ports

## Common Pitfalls
- Port 9100 is used by node_exporter AND often blocked externally on VPS
- Port 3000 conflicts with many development tools (Grafana, create-react-app)
- Always kill old process before starting new one on same port
```

---

#### R4: Next.js Production Deployment on Shared VPS
**Category:** Infrastructure Rule
**Applicable to:** Next.js projects on resource-constrained VPS

```markdown
# Next.js Production on Shared VPS

## OOM Prevention
- [ ] Set NODE_OPTIONS="--max-old-space-size=512" (or 1024 for 4GB+ VPS)
- [ ] Use `next build` with standalone output mode
- [ ] Kill old Next.js process before starting new (`pkill -f "next start"`)
- [ ] Monitor memory: `ps aux --sort=-%mem | head`

## Cache Headers
- [ ] Set Cache-Control for static assets (/_next/static/): `max-age=31536000, immutable`
- [ ] Set short cache for HTML pages: `no-cache` or `max-age=60`
- [ ] Chunk hash mismatch: always kill old process before starting new

## Deployment Steps
1. `git pull origin main`
2. `pkill -f "next start"` (kill old process FIRST)
3. `pnpm build` (standalone mode)
4. `pnpm start` (or PM2/systemd)
5. Verify health: `curl -s http://localhost:7100`

## Common Pitfalls
- Chunk hash mismatch after deploy → old process serving stale JS chunks
- OOM killer terminates Next.js → reduce max-old-space-size
- ISR revalidation creates memory spikes → use on-demand revalidation
```

---

### 3. Templates

#### T1: NestJS Module Template (HopperRU)
```
<module>/
├── <module>.module.ts    — @Module with imports, controllers, providers
├── <module>.controller.ts — @Controller with @ApiTags, DTOs, guards
├── <module>.service.ts   — Business logic, Prisma queries
├── <module>.dto.ts       — class-validator DTOs (Create, Update, Response)
└── <module>.spec.ts      — Jest unit tests
```

#### T2: Telegram Bot Command Template
```typescript
// commands/<name>.ts
import { Context } from 'telegraf';
import { ApiClient } from '../services/api-client';

export function register<Name>Command(bot: Telegraf, api: ApiClient) {
  bot.command('<name>', async (ctx: Context) => {
    // 1. Parse user input
    // 2. Call internal API
    // 3. Format response
    // 4. Reply with inline keyboard
  });
}
```

---

### 4. Snippets

#### S1: Russian Holiday Calendar (for ML prediction)
```python
RUSSIAN_HOLIDAYS_2026 = {
    '2026-01-01': 'Новый год', '2026-01-02': 'Новогодние каникулы',
    '2026-01-07': 'Рождество', '2026-02-23': 'День защитника',
    '2026-03-08': 'Международный женский день',
    '2026-05-01': 'День труда', '2026-05-09': 'День Победы',
    '2026-06-12': 'День России', '2026-11-04': 'День народного единства',
}
```

#### S2: Top-20 Russian Domestic Airports
```typescript
export const SUPPORTED_AIRPORTS = [
  'SVO', 'DME', 'VKO', 'LED', 'AER', 'KRR', 'SVX', 'OVB',
  'KZN', 'ROV', 'UFA', 'VOG', 'KGD', 'MRV', 'IKT', 'VVO',
  'TJM', 'PEE', 'GOJ', 'CEK',
] as const;
```

---

### 5. New Insights (May 2026)

- **Redis cache TTL for booking flow:** TTL must be >10min. Using 5min TTL caused "flight not found" errors during the booking flow because cached search results expired before the user completed payment.
- **flight_id cannot be UUID with external APIs:** Travelpayouts IDs start with "tp-" prefix. Using UUID-only validation broke external provider integration. Solution: use string type for flight_id, validate format per provider.
- **Next.js chunk hash mismatch:** After VPS deploy, users get "ChunkLoadError" because old Next.js process serves stale JS chunks. Always kill old process before starting new one (`pkill -f "next start"` before `pnpm start`).

---

## Harvest Statistics

| Category | Extracted | Reusable |
|----------|:---------:|:--------:|
| Patterns | 6 | 6 |
| Rules | 4 | 4 |
| Templates | 2 | 2 |
| Snippets | 2 | 2 |
| Insights | 9 | 9 |
| **Total** | **23** | **23** |

## Cross-Project Applicability

| Artifact | Domains |
|----------|---------|
| P1 Travel Fintech OTA | Any price-volatile marketplace (tickets, hotels, car rental, crypto) |
| P2 Telegram-First | Any RU/CIS market consumer product |
| P3 Cold Start ML | Any ML product starting from zero data |
| P4 YooKassa Payment | Any Russian e-commerce with MIR/SBP payments |
| P5 Multi-Provider Search | Any aggregator needing cascading data sources |
| P6 BookingProvider Abstraction | Any marketplace with multiple backend providers |
| R1 Russian Data Compliance | Any project with Russian users |
| R2 Fintech Validation | Any fintech protection product globally |
| R3 VPS Port Management | Any multi-service project on shared VPS |
| R4 Next.js on VPS | Any Next.js project on resource-constrained servers |
