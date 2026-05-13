# Development Insights: HopperRU

---

## 2026-05-13 — Telegram заблокирован в РФ с апреля 2026 — архитектурный пивот

**Tags:** telegram, blocking, architecture-pivot, critical

**Problem:**
Роскомнадзор заблокировал Telegram в России с апреля 2026. Проект был спроектирован как Telegram-first (ADR-2), что делает основной канал дистрибуции недоступным для большинства пользователей без VPN.

**Solution:**
Архитектурный пивот: Web App становится PRIMARY интерфейсом. Telegram Bot сохраняется как ОПЦИЯ для пользователей с VPN (65M россиян используют VPN для доступа к Telegram по данным Дурова). PWA (Progressive Web App) заменяет Telegram Mini App для мобильного опыта. Push-уведомления через Web Push API вместо Telegram notifications.

**References:** [Фонтанка](https://www.fontanka.ru/2026/03/19/76319254/), [AppleInsider](https://appleinsider.ru/tips-tricks/blokirovka-telegram-v-rossii-chto-proishodit-v-aprele-2026.html), [Hi-Tech Mail.ru](https://hi-tech.mail.ru/news/145611-chto-segodnya-s-telegram/)

---

## 2026-05-12 — Parallel agent execution speeds up SPARC generation 3x

**Tags:** sparc-generation, parallel-agents, performance

**Problem:**
Generating 11 SPARC documents sequentially takes 20+ minutes. Each document requires reading Phase 0 context and writing 200-500 lines.

**Solution:**
Split into 2 parallel batches (Batch 1: 5 docs, Batch 2: 6 docs) using Agent tool with `run_in_background: true`. Both batches read the same Phase 0 files without conflict since they write to different output files. Total time: ~7 minutes instead of ~20.

**References:** Phase 1 execution in this session

---

## 2026-05-12 — Auto-push hook must run AFTER autocommit hooks

**Tags:** hooks, git-workflow, ordering

**Problem:**
If autopush.cjs runs before autocommit-insights.cjs finishes, the insight commits won't be pushed until next Stop event.

**Solution:**
Place autopush.cjs LAST in the Stop hooks array in settings.json. Claude Code executes Stop hooks sequentially in order, so last position guarantees all autocommits complete first.

**References:** .claude/settings.json, .claude/hooks/autopush.cjs

---

## 2026-05-12 — Russian travel market has ZERO fintech protection competitors

**Tags:** market-research, competitive-advantage, russia

**Problem:**
Initial assumption was that Russian OTAs (Aviasales, Yandex Travel, OneTwoTrip) might have similar fintech products to Hopper.

**Solution:**
After thorough research (6 competitors analyzed), confirmed that NO Russian travel platform offers Price Freeze, Cancel For Any Reason, or Price Drop Protection. This is a genuine Blue Ocean — validated through competitive matrix in Phase0_Discovery_Brief.md.

**References:** docs/Phase0_Discovery_Brief.md (Competitive Matrix section)

---

## 2026-05-12 — Insurance partner is critical path for CFAR

**Tags:** regulatory, insurance, cfar, blocker

**Problem:**
Cancel For Any Reason (CFAR) product requires licensed insurer (ЦБ regulation). Building this in-house requires ₽300M+ capital and 6-12 month licensing process.

**Solution:**
ADR-5: Partner with licensed Russian insurer (АльфаСтрахование, Ингосстрах, etc.) for CFAR underwriting. Price Freeze and Price Drop Protection can be self-insured (lower risk profile). Insurance partner API integration is estimated at 2-4 weeks after contract signing.

**References:** docs/ADR.md (ADR-5), docs/Phase0_Discovery_Brief.md (Risk Matrix)

---

## 2026-05-12 — Monorepo scaffold benefits from 3-agent parallelism

**Tags:** scaffolding, parallel-agents, monorepo

**Problem:**
Generating 6 packages with 87 files sequentially would take 30+ minutes. Packages have cross-dependencies (shared types → api → bot) but initial scaffolding can be parallelized.

**Solution:**
Split into 3 agents: (1) shared + db (foundation types), (2) api (backend), (3) bot + web + ml (clients + ML). Agents don't write to overlapping paths. Cross-package imports use @hopperru/shared which is generated first. Total time: ~12 minutes. Commit per logical group for safe recovery.

**References:** /start Phase 2 execution

---

## 2026-05-12 — Rule-based prediction as cold start solution (TRIZ #15 Dynamism)

**Tags:** ml, cold-start, triz, price-prediction

**Problem:**
Hopper uses 30B+ daily price points for 95% accuracy. We have zero historical data for Russian domestic routes.

**Solution:**
TRIZ Principle #15 (Dynamism): Phase 1 uses rule-based prediction with seasonal factors, day-of-week patterns, advance purchase curves, and Russian holiday calendar. Expected accuracy ~70%. As data accumulates, Phase 2 ML model (scikit-learn gradient boosting) trains on real data. Phase 3 deep learning (TensorFlow LSTM) when data volume sufficient. Each phase can be deployed independently.

**References:** docs/ADR.md (ADR-3), packages/ml/models/predictor.py, packages/ml/models/rules.py

---

## 2026-05-13 — YooKassa payment_url must be re-fetched from API for pending bookings

**Tags:** yookassa, payment, booking-flow, gotcha

**Problem:**
When a user returns to a pending booking to retry payment, the stored `payment_url` from the initial YooKassa payment creation is expired or invalid. Attempting to redirect the user to the old URL results in a YooKassa error page.

**Solution:**
Never store `payment_url` in the database for reuse. For pending bookings, always re-fetch the payment URL by calling the YooKassa Payments API (`GET /v3/payments/{id}`) to get the current `confirmation.confirmation_url`. If the payment object itself is expired, create a new payment. This ensures the user always gets a valid redirect URL.

**References:** packages/api/src/payment/payment.service.ts, YooKassa API docs (https://yookassa.ru/developers/api)

---

## 2026-05-13 — Dashboard /booking/:id vs /bookings/:id route confusion

**Tags:** next-js, routing, booking-dashboard, naming-convention

**Problem:**
The dashboard had two similar routes: `/booking/:id` (showing a single flight by flight ID) and `/bookings/:id` (showing a booking by booking ID). Developers and users confused the two, leading to "not found" errors when navigating from booking lists to booking details, because flight IDs and booking IDs have different formats and different API endpoints.

**Solution:**
Standardize routes: `/bookings` for the list, `/bookings/:bookingId` for booking details, and `/flights/:flightId` for flight details. Remove the ambiguous `/booking/:id` route entirely. Update all internal links and navigation to use the canonical paths. Add a redirect from `/booking/:id` to `/bookings/:id` for backwards compatibility.

**References:** packages/web/src/app/dashboard/, packages/web/src/app/bookings/

---

## 2026-05-13 — VPS port 9100 blocked externally, had to remap to 7100-7101

**Tags:** vps, port-management, deployment, adminvps

**Problem:**
Port 9100 (commonly used by node_exporter and initially planned for the web frontend) was blocked externally by the VPS provider (AdminVPS/HOSTKEY). The web application was unreachable from outside the server despite being correctly bound to 0.0.0.0:9100 inside the container.

**Solution:**
Remapped all service ports to a dedicated range: Web on 7100, API on 7101, ML on 9102. Updated docker-compose.yml port mappings, .env.example, Nginx reverse proxy config, and all documentation. Rule of thumb: always test external port accessibility with `curl` from an external machine before committing to a port scheme on shared VPS.

**References:** docker-compose.yml, .env.example, README/ru/admin-guide.md

---

## 2026-05-13 — Travelpayouts Data API returns only 1 best price per route

**Tags:** travelpayouts, flight-search, data-api, limitation

**Problem:**
The Travelpayouts Data API (`/v1/prices/cheap`) returns only the single best (cheapest) price per route/date combination, not a list of flights. This made the search results page look empty with just one option, unlike competitors showing 10-20 flights per route.

**Solution:**
Supplement the single real Travelpayouts price with estimated flights: generate 5-8 additional flight options with realistic price variations (+-10-30% from the base price), different airlines from the supported list, and varied departure times. Mark the Travelpayouts result as "verified price" and the estimated ones as "estimated". When Amadeus credentials become available, switch to Amadeus Flight Offers API which returns full flight lists.

**References:** packages/api/src/search/providers/travelpayouts.provider.ts, docs/features/real-flight-prices/

---
