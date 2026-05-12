# Refinement Document: HopperRU
**Version:** 1.0 | **Date:** 2026-05-12 | **Status:** Draft

---

## 1. Edge Cases Matrix

### 1.1 Search & Discovery

| # | Scenario | Expected Behavior | Severity | Test Type |
|---|----------|-------------------|----------|-----------|
| EC-01 | Empty search results (no flights for route/date) | Show "No flights found" with alternative date suggestions from prediction engine | Medium | Integration |
| EC-02 | Airline API timeout (>5s) | Return cached results if available (<15 min old), else show loading skeleton + retry button | High | Integration |
| EC-03 | Airline API returns partial results (1 of 3 providers) | Display available results with banner "More results loading..." + background retry | Medium | Integration |
| EC-04 | User searches past date | Client-side validation blocks submission; server returns 400 if bypassed | Low | Unit |
| EC-05 | Search for route with no historical data (no prediction possible) | Show "Insufficient data for prediction" badge; still show current prices | Medium | Unit |
| EC-06 | Extremely popular route (100+ concurrent searches) | Redis cache serves hot results; API rate limiter queues excess requests | High | Load |
| EC-07 | Malformed IATA code or invalid city name | Autocomplete prevents invalid input; server validates against IATA database | Low | Unit |

### 1.2 Price Prediction

| # | Scenario | Expected Behavior | Severity | Test Type |
|---|----------|-------------------|----------|-----------|
| EC-08 | ML service unavailable | Fallback to rule-based prediction (seasonality + day-of-week heuristics) | Critical | Integration |
| EC-09 | Prediction confidence below 50% | Show prediction with "Low Confidence" badge; do not offer Price Freeze for this route | Medium | Unit |
| EC-10 | Price changes dramatically between prediction and booking (+30%) | Re-validate price at booking time; show updated price with "Price changed" alert | High | E2E |
| EC-11 | Model returns negative price prediction | Clamp to minimum airline fare; log anomaly for model retraining | Low | Unit |
| EC-12 | Stale training data (last training >48h ago) | Alert ops via Prometheus metric; continue serving with current model | Medium | Monitoring |

### 1.3 Booking & Payment

| # | Scenario | Expected Behavior | Severity | Test Type |
|---|----------|-------------------|----------|-----------|
| EC-13 | Payment failure (insufficient funds, card declined) | Show specific error from YooKassa; hold booking for 15 min for retry; release after timeout | High | Integration |
| EC-14 | Price change during checkout (between search and payment) | Re-check price at payment initiation; if increased >5%, show updated price and require re-confirmation | Critical | E2E |
| EC-15 | Concurrent booking of last seat | Optimistic locking on airline API; first-confirmed wins; loser gets "Sold out" + alternative suggestions | Critical | Load |
| EC-16 | YooKassa webhook delayed (>5 min) | Polling fallback every 60s for pending payments; auto-cancel after 30 min | High | Integration |
| EC-17 | Double payment (webhook delivered twice) | Idempotency key on YooKassa payment ID; deduplicate at Booking Service | Critical | Integration |
| EC-18 | Partial refund failure | Retry refund 3 times with exponential backoff; alert support after failure; manual resolution queue | High | Integration |
| EC-19 | Booking confirmed but airline API fails to issue ticket | Mark booking as "Pending Ticketing"; retry 3x; escalate to manual processing; notify user of delay | Critical | Integration |

### 1.4 Fintech Products

| # | Scenario | Expected Behavior | Severity | Test Type |
|---|----------|-------------------|----------|-----------|
| EC-20 | Price Freeze expires with no booking | Auto-expire; no refund of freeze fee (per terms); send notification 24h before expiry | Medium | Unit |
| EC-21 | Price drops below frozen price | User pays lower current price (not frozen price); freeze fee non-refundable | Medium | E2E |
| EC-22 | Cancel For Any Reason claim while insurance partner API is down | Queue claim; process when partner recovers; send "Claim received, processing" notification | High | Integration |
| EC-23 | Price Drop Protection: price increases instead of drops | No action needed; product expires without payout; log for actuarial analysis | Low | Unit |
| EC-24 | Multiple fintech products on same booking | Apply each independently; no double-counting of refunds; clear UI showing each product status | Medium | E2E |
| EC-25 | Flight disruption detected but user already departed | Check boarding status; if not yet boarded, auto-rebook; if boarded, not applicable | High | Integration |

### 1.5 User & Authentication

| # | Scenario | Expected Behavior | Severity | Test Type |
|---|----------|-------------------|----------|-----------|
| EC-26 | Telegram user tries to access web app (account linking) | Prompt to link accounts via email/phone verification; merge watchlists and booking history | Medium | E2E |
| EC-27 | JWT token expired mid-booking | Silent refresh via refresh token; if refresh also expired, save booking state to localStorage, redirect to login | High | E2E |
| EC-28 | User requests data deletion (152-FZ) | Soft-delete immediately; hard-delete PII after 30 days; retain anonymized analytics data | Critical | Integration |
| EC-29 | Brute force login attempts | Lock account after 5 failed attempts for 15 min; CAPTCHA after 3 attempts | High | Integration |

### 1.6 Infrastructure

| # | Scenario | Expected Behavior | Severity | Test Type |
|---|----------|-------------------|----------|-----------|
| EC-30 | PostgreSQL primary down | Read replica serves read-only traffic; booking/payment disabled with "Maintenance" banner | Critical | Chaos |
| EC-31 | Redis down | Degrade gracefully: sessions fall back to JWT-only (no revocation); cache misses go to DB | High | Chaos |
| EC-32 | ClickHouse down | Analytics and training pipeline paused; core booking/search unaffected | Low | Chaos |
| EC-33 | Docker container OOM killed | Docker restart policy (on-failure, max 3); Prometheus alert on restart count | High | Monitoring |

---

## 2. Testing Strategy

### 2.1 Test Pyramid

```
        /‾‾‾‾‾‾‾‾‾‾‾‾‾\
       /   E2E (5%)      \        Playwright: critical user journeys
      /   Integration (15%) \      Supertest + Testcontainers: API + DB
     /     Unit (80%)         \    Jest (Node) + pytest (Python): business logic
    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

### 2.2 Coverage Targets

| Layer | Framework | Coverage Target | Focus Areas |
|-------|-----------|:---------------:|-------------|
| Unit (NestJS) | Jest | 80% lines | Services, guards, pipes, DTOs, validators |
| Unit (Python ML) | pytest | 80% lines | Feature engineering, model inference, data transforms |
| Unit (Frontend) | Vitest + Testing Library | 70% lines | Components, hooks, form validation |
| Integration | Supertest + Testcontainers | 60% critical paths | API endpoints with real DB, payment webhook handling |
| E2E | Playwright | All critical journeys | Search -> Book -> Pay, Fintech purchase, Telegram bot flow |
| Load | k6 | N/A | 500 concurrent users, 100 searches/sec |
| Security | OWASP ZAP | N/A | Automated scan on staging before each release |

### 2.3 Critical Test Scenarios (E2E)

| # | Journey | Steps | Pass Criteria |
|---|---------|-------|---------------|
| E2E-01 | Search to booking | Search MOW->LED -> Select flight -> Pay via SBP -> Receive confirmation | Booking status = Confirmed, e-ticket generated |
| E2E-02 | Price Freeze flow | Search -> Get prediction "Wait" -> Purchase Price Freeze -> Return in 7 days -> Book at frozen price | Frozen price applied at checkout |
| E2E-03 | Cancel For Any Reason | Book flight -> Purchase CFAR -> Cancel booking -> Receive full refund | Refund processed, insurance claim filed |
| E2E-04 | Telegram bot booking | `/start` -> Search via inline -> Select -> Pay (YooKassa redirect) -> Confirmation in chat | All steps complete within Telegram |
| E2E-05 | Price Drop Protection | Book flight -> Purchase PDP -> Price drops by 15% -> Receive difference refund | Automatic refund of price difference |

### 2.4 Test Data Strategy

- **Unit tests:** Factory functions via `@faker-js/faker` for deterministic seeded data
- **Integration tests:** Testcontainers with PostgreSQL + Redis; seeded migration scripts
- **E2E tests:** Dedicated staging environment with mock airline/hotel APIs (WireMock)
- **Load tests:** Synthetic data generator producing realistic search/booking patterns

---

## 3. Performance Optimization

### 3.1 Database Indexing Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| `price_snapshot` | `(route_id, captured_at DESC)` | B-tree | Fast latest-price lookup per route |
| `price_snapshot` | `(captured_at)` | B-tree | Efficient pruning of old snapshots |
| `booking` | `(user_id, status)` | B-tree | User booking list queries |
| `booking` | `(status, created_at)` | B-tree | Admin dashboard, stale booking cleanup |
| `route` | `(origin_iata, destination_iata, departure_date)` | B-tree | Search query optimization |
| `search_history` | `(user_id, searched_at DESC)` | B-tree | Recent searches for personalization |
| `fintech_product` | `(booking_id, product_type)` | B-tree | Fintech status lookup per booking |
| `user` | `(telegram_id)` | Unique B-tree | Telegram auth lookup |
| `user` | `(email)` | Unique B-tree | Email login |

### 3.2 Caching Strategy

| Data | Cache Key Pattern | TTL | Invalidation |
|------|-------------------|-----|-------------|
| Search results | `search:{origin}:{dest}:{date}:{hash(filters)}` | 5-15 min | TTL expiry |
| Prediction | `pred:{route_id}:{date}` | 1h | TTL expiry + forced refresh on new training |
| User session | `session:{user_id}` | 7 days | Explicit logout / token rotation |
| Rate limit | `rate:{user_id}:{window}` | 1 min | TTL expiry |
| Popular routes | `popular:{region}` | 1h | Scheduled refresh |
| Route autocomplete | `autocomplete:{prefix}` | 24h | Daily rebuild |

### 3.3 Query Optimization

- **Read replicas:** Route search queries to PostgreSQL read replica for searches
- **Pagination:** Cursor-based pagination for search results (not offset-based)
- **Projection:** Select only required columns in Prisma queries (`select` instead of full model)
- **Batch loading:** DataLoader pattern for N+1 query prevention in aggregated endpoints
- **Connection pooling:** PgBouncer for PostgreSQL connection pooling (max 100 connections per service)

### 3.4 Frontend Performance

| Optimization | Implementation |
|-------------|---------------|
| Code splitting | Next.js dynamic imports for non-critical routes |
| Image optimization | Next.js `<Image>` with WebP/AVIF, lazy loading |
| Bundle analysis | `@next/bundle-analyzer` in CI, budget alerts at 250KB initial JS |
| Static generation | ISG for landing pages, popular route pages |
| Prefetching | Prefetch likely next pages on hover/viewport entry |

---

## 4. Security Hardening

### 4.1 Input Validation

| Vector | Protection |
|--------|-----------|
| SQL Injection | Prisma parameterized queries (never raw SQL without `$queryRawUnsafe` ban in ESLint) |
| XSS | React auto-escaping, CSP header (`script-src 'self'`), `sanitize-html` for any user-generated content |
| CSRF | SameSite=Strict cookies, CSRF tokens for state-changing POST requests |
| Path Traversal | Whitelist-based file access, no user input in file paths |
| Mass Assignment | Explicit DTOs with class-validator, no spread of request body into DB operations |
| ReDoS | Timeout on regex execution, use RE2 for user-provided patterns |

### 4.2 API Security

| Measure | Details |
|---------|---------|
| Rate limiting | Per-user (100/min), per-IP (50/min), per-endpoint (search: 30/min) |
| Request size limits | 1MB max body, 100KB max JSON payload |
| CORS | Whitelist of allowed origins (web domain + Telegram bot domain) |
| Security headers | `helmet` middleware: HSTS, X-Frame-Options, X-Content-Type-Options |
| API key rotation | YooKassa and partner API keys rotated quarterly, stored in Docker secrets |

### 4.3 Data Protection (152-FZ Enhanced)

| Data Category | Classification | Storage | Access |
|---------------|---------------|---------|--------|
| Email, phone, name | PII | PostgreSQL (encrypted column) | User Service only |
| Passport / ID | Sensitive PII | PostgreSQL (AES-256 per-field) | Booking Service only (on-demand decrypt) |
| Payment tokens | PCI-adjacent | Never stored (YooKassa tokenization) | N/A |
| Search history | Behavioral | PostgreSQL / ClickHouse | Analytics (anonymized after 90 days) |
| IP addresses | PII (under 152-FZ) | Access logs (rotated 30 days) | Ops only |

---

## 5. Monitoring & Alerting

### 5.1 Metrics Stack

```
Application → Prometheus (scrape /metrics) → Grafana (dashboards + alerts) → Telegram (notifications)
```

### 5.2 Key Metrics & Alerts

| Metric | Source | Warning | Critical | Action |
|--------|--------|:-------:|:--------:|--------|
| API p99 latency | Prometheus histogram | > 1s | > 3s | Scale replicas / investigate slow queries |
| Error rate (5xx) | Prometheus counter | > 1% | > 5% | Page on-call, check logs |
| Payment success rate | Custom metric | < 95% | < 90% | Check YooKassa status, review error codes |
| ML inference latency | FastAPI metrics | > 150ms | > 500ms | Check model size, scale ML service |
| DB connection pool usage | PgBouncer metrics | > 70% | > 90% | Increase pool size or scale services |
| Redis memory usage | Redis INFO | > 70% | > 85% | Evict cold keys, increase memory |
| Disk usage | node_exporter | > 70% | > 85% | Clean logs, expand volume |
| Container restart count | Docker metrics | > 1/hour | > 3/hour | Investigate OOM, crash loops |
| Fintech claim processing time | Custom metric | > 24h | > 72h | Escalate to insurance partner |
| Search result cache hit ratio | Custom metric | < 40% | < 20% | Review TTL settings, warm cache |

### 5.3 Error Budget

| Service | Monthly SLO | Error Budget (30 days) | Measured By |
|---------|:-----------:|:----------------------:|-------------|
| Search API | 99.5% | 3.6 hours downtime | Uptime + p99 < 3s |
| Booking API | 99.9% | 43 min downtime | Uptime + payment success |
| Prediction API | 99.0% | 7.2 hours downtime | Uptime (non-critical, has fallback) |
| Telegram Bot | 99.5% | 3.6 hours downtime | Webhook delivery success rate |

### 5.4 Dashboards

| Dashboard | Audience | Key Panels |
|-----------|----------|------------|
| System Overview | Ops | CPU, memory, disk, network per container |
| API Performance | Backend team | p50/p95/p99 latency, error rate, throughput |
| Business Metrics | Product/Founders | DAU, searches, bookings, fintech attach rate, revenue |
| ML Pipeline | Data team | Model accuracy, training duration, prediction distribution |
| Payment Health | Finance | Payment success/failure by method, refund queue |

---

## 6. Rollback Strategy

### 6.1 Deployment Rollback

| Scenario | Procedure | Time to Rollback |
|----------|-----------|:----------------:|
| Failed deployment (health check fails) | Docker Compose rolls back to previous image tag automatically | < 1 min |
| Bug detected post-deploy (< 1h) | `docker compose pull && docker compose up -d` with previous tag | < 5 min |
| Bug detected post-deploy (> 1h) | Git revert commit, trigger CI/CD rebuild | < 15 min |
| Database migration failure | Prisma `migrate resolve` + manual rollback SQL (each migration has a `down.sql`) | < 30 min |

### 6.2 Data Rollback

| Data Store | Backup Frequency | Retention | Recovery Time |
|------------|:----------------:|:---------:|:-------------:|
| PostgreSQL | Daily full + continuous WAL | 30 days | < 30 min (point-in-time) |
| Redis | RDB snapshot every 1h | 7 days | < 5 min |
| ClickHouse | Daily snapshot | 14 days | < 1h |

### 6.3 Feature Flags for Safe Rollout

All new features are gated behind Redis-backed feature flags:

```typescript
// Example: gradual rollout of new prediction model
if (await featureFlags.isEnabled('prediction-v2', { userId, percentage: 10 })) {
  return predictionServiceV2.predict(route);
} else {
  return predictionServiceV1.predict(route);
}
```

Rollback procedure: Flip flag to 0% -> all users revert to previous behavior instantly, without redeployment.
