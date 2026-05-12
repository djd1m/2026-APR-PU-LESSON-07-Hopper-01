# Final Summary: HopperRU
**Version:** 1.0 | **Date:** 2026-05-12 | **Status:** Draft

---

## 1. Project Overview

HopperRU is an AI-powered travel booking platform with fintech protection products, adapted from the proven Hopper model ($850M revenue, 70%+ from fintech) for the Russian market. The platform combines price prediction algorithms with financial protection products (Price Freeze, Cancel For Any Reason, Price Drop Protection) that no Russian competitor currently offers. Distribution is Telegram-first, with a web app for complex flows. The $11.1B Russian online travel market presents a clear opportunity because established players (Aviasales, Yandex Travel, OneTwoTrip) compete on search and booking mechanics while ignoring the financial anxiety dimension of travel purchasing decisions.

---

## 2. Key Decisions

| # | Decision | Rationale | ADR |
|---|----------|-----------|-----|
| 1 | Distributed Monolith over Microservices | Startup velocity: single repo, single CI, single deploy. Clear service boundaries allow future extraction. | ADR-1 |
| 2 | Telegram-First over Native Mobile App | 90M+ Telegram users in Russia; bot development costs 10x less than native apps; viral sharing built-in. | ADR-2 |
| 3 | Rule-Based Prediction (Phase 1) over ML-First | Cold start problem: no historical RU price data. Rules deliver 70% accuracy immediately; ML follows with data accumulation. | ADR-3 |
| 4 | YooKassa over Stripe | MIR and SBP are mandatory payment methods in Russia since 2022; Stripe does not support them. YooKassa is the only production-grade option. | ADR-4 |
| 5 | Insurance Partner over Self-Insurance | Cancel For Any Reason and Flight Disruption Guarantee require a Central Bank insurance license; partnering with AlfaStrakhovanie/Ingosstrakh avoids 12+ month licensing process. | ADR-5 |
| 6 | PostgreSQL + Redis + ClickHouse as data layer | PG for ACID transactional data, Redis for sub-ms cache/sessions, ClickHouse for analytical queries over billions of price snapshots. | Architecture |
| 7 | NestJS (TypeScript) for backend | Enterprise patterns (DI, modules, guards), strong typing, large RU developer community, good NestJS hiring pool. | Architecture |
| 8 | Selectel/Yandex Cloud for hosting | 152-FZ mandates RU data residency; both providers offer compliant VPS with competitive pricing. | Architecture |

---

## 3. Architecture Summary

- **Pattern:** Distributed Monolith in a Monorepo (Turborepo)
- **Backend:** 7 NestJS services (Gateway, Search, Prediction, Booking, Fintech, User, Notification) + 1 FastAPI ML service
- **Frontend:** Next.js (web) + telegraf.js (Telegram bot)
- **Data:** PostgreSQL 16 (primary), Redis 7 (cache/sessions), ClickHouse (analytics/ML training)
- **Payments:** YooKassa (MIR, SBP, bank cards)
- **Infrastructure:** Docker Compose on Selectel/Yandex Cloud VPS, nginx reverse proxy, Let's Encrypt TLS
- **CI/CD:** GitHub Actions -> Docker build -> SSH deploy
- **Monitoring:** Prometheus + Grafana + Telegram alerts

---

## 4. MVP Scope (Features)

### Phase 1 -- MVP (Months 1-3)

| Feature | Priority | Description |
|---------|:--------:|-------------|
| Flight search | P0 | Search domestic RU flights (top-20 routes), filter/sort results |
| Price prediction | P0 | Buy/Wait recommendation with confidence score (rule-based Phase 1) |
| Booking | P0 | Complete flight booking with YooKassa payment (MIR, SBP) |
| Price Freeze | P0 | Lock current price for up to 21 days for flat fee |
| Cancel For Any Reason | P0 | Full refund insurance via partner at percentage-based fee |
| Telegram bot | P0 | Full search + predict + book flow via inline keyboards |
| Web app | P0 | Responsive web interface for search, prediction, booking |
| User accounts | P0 | Registration (email, Telegram), profile, booking history |
| Price alerts | P1 | Watch a route, get notified when price drops below threshold |

### Phase 1.5 (Month 4-6)

| Feature | Priority | Description |
|---------|:--------:|-------------|
| Price Drop Protection | P1 | 10-day post-booking price monitoring with automatic refund |
| Hotel search & booking | P1 | Hotel vertical with same fintech products |
| Carrot Cash (cashback) | P2 | In-app cashback balance earned per booking |
| Weekly digest | P2 | Personalized weekly email/Telegram with watchlist updates |
| ML model v1 | P1 | scikit-learn gradient boosting trained on accumulated data |

### Phase 2 (Month 7-12)

| Feature | Priority | Description |
|---------|:--------:|-------------|
| Train search | P2 | RZD integration for train tickets |
| Flight Disruption Guarantee | P2 | Auto-rebook on delays 2h+ |
| TensorFlow prediction model | P2 | LSTM time-series model for 85%+ accuracy |
| B2B White-Label API | P3 | HTS-style API for banks and fintech partners |
| Digital Ruble payment | P2 | Integration with Central Bank CBDC (mandatory 09.2026) |

---

## 5. Risk Summary (Top 5)

| # | Risk | Probability | Impact | Mitigation | Owner |
|---|------|:-----------:|:------:|-----------|-------|
| 1 | **Insurance licensing:** Cancel For Any Reason requires licensed insurance partner | Medium | Critical | Partnership with AlfaStrakhovanie/Ingosstrakh; signed before MVP launch | Legal |
| 2 | **Price prediction accuracy on RU data** | Medium | Medium | Phase 1 rule-based (70% accuracy); ML Phase 2 as data accumulates; transparent confidence display | ML Team |
| 3 | **Yandex copies fintech features within 6 months** | Medium | Medium | Fintech moat: insurance partner integration = 6-12 month lag; data moat grows with usage | Product |
| 4 | **152-FZ compliance failure** | Low | Critical | RU-hosted servers from day 1; Roskomnadzor registration; legal audit pre-launch | Legal/DevOps |
| 5 | **Airline API access/reliability** | Medium | High | Contracts with 2+ providers; cached results for resilience; manual fallback queue | BD/Dev |

---

## 6. Timeline: 90-Day Plan

| Week | Phase | Deliverables | Gate |
|------|-------|-------------|------|
| 1-2 | Validation | 20 CustDev interviews, Telegram bot MVP (price check only), landing page, 200+ beta signups | Gate 1: >= 70% problem confirmation |
| 3-4 | MVP Build | Telegram bot + web: search, prediction (rule-based), booking, Price Freeze (manual fulfillment), 50 beta testers | Gate 2: > 30% D7 retention |
| 5-8 | First Users | Viral Telegram mechanics, SEO content, full fintech bundle (Price Freeze + CFAR), YooKassa integration | Gate 3: > 1% free-to-paid conversion |
| 9-12 | PMF Signals | Sean Ellis test, scale to 5K users, pitch deck v1, pre-seed fundraising | Gate 4: > 40% "Very disappointed" |

---

## 7. Budget

### 6-Month Budget: ₽5.7M (~$63K)

| Category | M1-2 | M3-4 | M5-6 | Total |
|----------|:----:|:----:|:----:|:-----:|
| Team (3 people x ₽250K/mo) | ₽1,500,000 | ₽1,500,000 | ₽1,500,000 | ₽4,500,000 |
| Marketing | ₽50,000 | ₽200,000 | ₽500,000 | ₽750,000 |
| Infrastructure / APIs | ₽50,000 | ₽100,000 | ₽200,000 | ₽350,000 |
| Legal (insurance partner) | ₽100,000 | ₽0 | ₽0 | ₽100,000 |
| **Total** | **₽1,700,000** | **₽1,800,000** | **₽2,200,000** | **₽5,700,000** |

### Funding Roadmap

| Round | Timing | Amount | Valuation |
|-------|--------|--------|-----------|
| Bootstrap | M0 | ₽2-5M | -- |
| Pre-seed | M3-6 | ₽15-30M | ₽50-100M |
| Seed | M9-12 | ₽90-180M | ₽500M-1B |
| Series A | M18-24 | ₽900M-1.8B | ₽5-10B |

---

## 8. Success Criteria

### MVP (Month 3)

| Metric | Target |
|--------|:------:|
| Total users | 5,000 |
| Paying users | 50+ |
| Fintech attach rate | >= 10% |
| MRR | >= ₽125,000 |
| D7 retention (Telegram bot) | >= 30% |
| Price prediction accuracy (rule-based) | >= 70% |
| System uptime | >= 99.5% |

### Month 12

| Metric | Target |
|--------|:------:|
| Total users | 200,000 |
| Paying users | 8,000 |
| Fintech attach rate | >= 25% |
| MRR | >= ₽20,000,000 |
| Sean Ellis score | >= 40% |
| Prediction accuracy (ML) | >= 85% |

---

## 9. Next Steps After MVP

1. **Close pre-seed round** (₽15-30M) based on PMF signals and initial revenue
2. **Launch hotel vertical** with same fintech product suite
3. **Train ML model v1** on accumulated price/search data (scikit-learn gradient boosting)
4. **Expand route coverage** from top-20 to top-100 domestic routes + CIS destinations
5. **Hire data scientist** to improve prediction accuracy toward 85%+ target
6. **Begin B2B conversations** with banks for white-label integration (Tinkoff, Alfa-Bank)
7. **Integrate Digital Ruble** payment method ahead of mandatory deadline (09.2026)
8. **Add train vertical** (RZD integration) for comprehensive domestic travel coverage
9. **Develop corporate travel** offering (B2B segment growing 30% YoY)
10. **Prepare seed round** materials based on Month 9-12 metrics

---

## 10. Document References

| Document | Path | Contents |
|----------|------|----------|
| Phase 0: Fact Sheet | `docs/Phase0_Fact_Sheet.md` | Hopper company/product research (53 verified facts) |
| Phase 0: Discovery Brief | `docs/Phase0_Discovery_Brief.md` | Market analysis, business model, growth engine, launch playbook |
| Architecture | `docs/Architecture.md` | System design, tech stack, data model, security, integrations |
| Refinement | `docs/Refinement.md` | Edge cases (33), testing strategy, performance, security hardening |
| Completion | `docs/Completion.md` | Deployment pipeline, Docker config, CI/CD, monitoring, runbook |
| C4 Diagrams | `docs/C4_Diagrams.md` | System Context, Container, Component, Code-level diagrams |
| Architecture Decision Records | `docs/ADR.md` | 5 ADRs: architecture, distribution, ML strategy, payments, insurance |
