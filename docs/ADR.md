# Architecture Decision Records: HopperRU
**Version:** 1.0 | **Date:** 2026-05-12 | **Status:** Draft

---

## ADR-1: Distributed Monolith over Microservices

**Status:** Accepted

### Context

HopperRU is a startup with a 3-person team, targeting MVP delivery in 90 days. The system has 7+ logical services (search, prediction, booking, fintech, user, notification, ML). We need to choose between:

1. **True microservices** -- each service independently deployed, separate databases, async communication (Kafka/RabbitMQ), service mesh
2. **Monolith** -- single deployable unit, shared database, in-process function calls
3. **Distributed monolith** -- separate services in a monorepo, independent processes, shared database, synchronous HTTP communication, single Docker Compose deployment

Hopper (the original) uses Scala microservices with Kafka, HBase, and a dedicated ML platform. That architecture was built over 15+ years with 1,200 employees and $700M+ in funding.

### Decision

We adopt a **Distributed Monolith in a Monorepo** pattern. All services live in one Git repository, are built with one CI pipeline, and deployed as a coordinated Docker Compose stack. Services communicate via synchronous HTTP on an internal Docker network. They share a PostgreSQL database (with schema-level separation via Prisma).

### Consequences

**Positive:**
- Single repository simplifies code sharing, refactoring, and onboarding
- One CI/CD pipeline reduces DevOps overhead (critical with 3-person team)
- Docker Compose single-command deployment to VPS -- no Kubernetes needed
- Clear service boundaries in code (NestJS modules) prepare for future extraction
- Shared database eliminates distributed transaction complexity (no sagas needed for MVP)
- Turborepo enables parallel builds and caching across all packages

**Negative:**
- Shared database creates coupling risk -- services can accidentally cross schema boundaries
- Single VPS is a single point of failure (mitigated by automated backups + fast re-provisioning)
- Cannot independently scale individual services (mitigated: Docker Compose replicas can scale hot services)
- Deployment is all-or-nothing (mitigated: feature flags for gradual rollout, health checks for auto-rollback)

---

## ADR-2: Telegram-First over Mobile App

**Status:** Accepted

### Context

Hopper's distribution is mobile-first (iOS + Android), with 120M+ app downloads. For the Russian market, we need to choose our primary distribution channel:

1. **Native mobile apps** (iOS + Android) -- Hopper's approach
2. **Web-only** -- traditional OTA approach (Aviasales, OneTwoTrip)
3. **Telegram-first** -- bot + Telegram Web App for primary interaction, web app for complex flows

Key market data:
- Telegram has 90M+ monthly active users in Russia (2025)
- Telegram is the primary messaging platform, replacing WhatsApp/Viber in many demographics
- Telegram Bot Payments API supports YooKassa natively
- Native app development (iOS + Android) costs 5-10x more than a Telegram bot for the same feature set
- App Store/Google Play distribution in Russia is complicated (Google Play restrictions post-2022)

### Decision

We adopt a **Telegram-first** distribution strategy. The Telegram bot is the primary interface for search, prediction, and booking. A responsive web app (Next.js) serves as a secondary channel for complex flows (detailed search filters, account management, booking history) and SEO landing pages.

### Consequences

**Positive:**
- Development cost: 1 bot developer vs. 2-4 mobile developers (iOS + Android)
- Distribution: zero-install access for 90M+ Russian Telegram users
- Viral mechanics: native sharing in Telegram groups/channels ("I saved RUB 6,000")
- Payments: Telegram Bot Payments API integrates with YooKassa directly
- Push notifications: Telegram messages have higher open rates than app push notifications in Russia
- Time to market: bot MVP in 2 weeks vs. 8-12 weeks for native apps
- No App Store review delays or compliance issues

**Negative:**
- Limited UI capabilities compared to native apps (mitigated: Telegram Web App for rich interfaces)
- Platform dependency on Telegram (mitigated: web app as fallback; Telegram's market position in Russia is very strong)
- No offline access (acceptable for travel booking -- always needs network)
- Harder to implement complex visualization (price calendars, charts) -- offload to web app via deep links
- Brand presence: no app icon on home screen (mitigated: Telegram allows pinning bots)

---

## ADR-3: Rule-Based Prediction Phase 1 over ML-First

**Status:** Accepted

### Context

Price prediction is the core value proposition of HopperRU. Hopper's engine analyzes 30B+ price points daily with TensorFlow models trained over 15+ years of data. We face the **cold start problem**: no historical Russian domestic flight price data exists in our system at launch.

Options:
1. **ML-first:** Train models on publicly available data (e.g., scraping Aviasales) before launch
2. **Rule-based first:** Launch with hand-crafted heuristics, accumulate data, train ML models later
3. **Hybrid:** Rule-based with ML enhancement as data accumulates

Key constraints:
- TRIZ analysis from Discovery Brief identified this exact contradiction: need big data for accuracy, but have no data at start
- TRIZ Resolution: Principle #15 (Dynamism) -- start simple, evolve with data
- Hopper's 95% accuracy took 15+ years of data accumulation
- Russian domestic flight pricing has well-known patterns (seasonality, advance purchase, holiday spikes)

### Decision

We adopt a **phased prediction strategy**:

- **Phase 1 (M1-6):** Rule-based model targeting 70% accuracy. Hand-crafted rules encode known pricing patterns: seasonality (summer/New Year peaks), advance purchase discount curves, day-of-week effects, holiday calendars.
- **Phase 2 (M7-12):** Gradient boosting model (scikit-learn) trained on accumulated search/booking data. Target 85% accuracy.
- **Phase 3 (M13+):** LSTM time-series model (TensorFlow) for route-specific predictions. Target 95% accuracy.

Model selection is managed by `ModelRegistry` with automatic promotion when a new model outperforms the current one on validation data.

### Consequences

**Positive:**
- Immediate launch without data dependency -- MVP ships on time
- 70% accuracy is still better than zero (no Russian competitor offers any prediction)
- Transparent confidence scoring tells users when predictions are low-confidence
- Data flywheel: every search and booking improves future models
- Phased approach reduces ML hiring pressure -- no data scientist needed until Phase 2
- Rule-based model is interpretable: easy to debug and explain to users ("prices rise 3 weeks before departure")

**Negative:**
- 70% accuracy may underwhelm users expecting Hopper-level precision (mitigated: confidence badges, "beta" label)
- Rule-based models cannot capture route-specific patterns (e.g., charter flights to Antalya)
- Manual rule maintenance is needed as market conditions change (seasonal patterns may shift)
- Phase transition (rules -> ML) requires careful A/B testing to avoid accuracy regression
- Risk of anchoring: if rule-based works "well enough," team may delay ML investment

---

## ADR-4: YooKassa over Stripe

**Status:** Accepted

### Context

Payment processing is critical for both booking revenue and fintech product fees. The Russian payment landscape changed dramatically in 2022:

- Visa and Mastercard suspended operations in Russia
- MIR (National Payment Card System) became the primary card network
- SBP (Sistema Bystrykh Platezhei / Fast Payment System) emerged as a dominant P2P and merchant payment method
- QR code payments gained significant market share

Options:
1. **Stripe** -- global standard, excellent developer experience, extensive documentation
2. **YooKassa** (formerly Yandex.Kassa) -- Russian payment gateway, supports MIR + SBP
3. **Tinkoff Acquiring** -- bank-based acquiring, good API
4. **CloudPayments** -- Russian payment provider

### Decision

We adopt **YooKassa** as the primary (and initially sole) payment provider.

### Consequences

**Positive:**
- Full MIR card support -- mandatory for domestic transactions
- SBP (Fast Payment System) integration -- increasingly preferred by Russian consumers
- Native Telegram Bot Payments integration -- seamless checkout in Telegram
- Bank card support (Russian-issued Visa/MC where still functional)
- Well-documented REST API with webhook-based payment status updates
- Recurring payments support (for future subscription features)
- Test environment (sandbox) for development and staging
- Established reputation -- former Yandex product, trusted by consumers

**Negative:**
- Vendor lock-in to a single Russian payment provider (mitigated: abstract payment interface in BookingService allows adding providers)
- No international card support for tourists (acceptable for MVP targeting domestic travelers)
- Settlement delays: T+1 to T+3 business days (standard for Russian acquiring)
- Limited dispute resolution compared to Stripe (manual process for chargebacks)
- Documentation quality below Stripe's standard (mitigated: active developer community)
- Digital Ruble (CBDC) not yet supported -- will need separate integration by 09.2026 mandatory deadline

---

## ADR-5: Insurance Partner over Self-Insurance

**Status:** Accepted

### Context

HopperRU's fintech products -- Cancel For Any Reason (CFAR), Flight Disruption Guarantee, and Price Drop Protection -- involve financial risk. When a user purchases CFAR for RUB 2,500 and then cancels a RUB 50,000 flight, HopperRU must pay out RUB 50,000.

Hopper manages this risk through a combination of internal actuarial models and reinsurance partnerships. In Russia, the regulatory landscape adds constraints:

- The Central Bank of Russia (Bank of Russia / ЦБ РФ) requires an insurance license for any entity offering insurance-like products
- Obtaining a ЦБ license requires: minimum capital of RUB 300M+, actuarial staff, compliance infrastructure, 6-18 month approval process
- Operating without a license carries criminal penalties under Russian financial law
- The Discovery Brief flagged this as Risk #1 (Medium probability, Critical impact)

Options:
1. **Self-insurance** -- HopperRU bears all risk, builds internal actuarial capability, obtains ЦБ license
2. **Insurance partner** -- Partner with a licensed Russian insurer who underwrites the risk
3. **Hybrid** -- Start with partner, transition to self-insurance after obtaining license
4. **No fintech** -- Drop financial protection products entirely

### Decision

We adopt the **Insurance Partner** model. We will partner with a licensed Russian insurance company (target: AlfaStrakhovanie or Ingosstrakh) that underwrites Cancel For Any Reason, Flight Disruption Guarantee, and Price Drop Protection policies. HopperRU acts as an insurance agent (no ЦБ license required for agents) and earns a commission on each fintech product sold.

### Consequences

**Positive:**
- No ЦБ license required -- HopperRU operates as insurance agent (registration with ЦБ as agent is simple, weeks not months)
- Zero balance sheet risk -- insurance partner bears the underwriting risk
- Immediate market entry -- no 6-18 month licensing delay
- Actuarial expertise provided by partner -- proper risk pricing from day 1
- Regulatory compliance handled by partner (reporting, reserves, consumer protection)
- Credible product: "insured by AlfaStrakhovanie" builds consumer trust
- Revenue share model (typically 20-40% commission) provides good margin without risk

**Negative:**
- Lower margin than self-insurance: 20-40% commission vs. 50-70% gross margin if self-insured
- Product design constrained by partner's risk appetite and policy terms
- Dependency on partner's claims processing speed (SLA negotiation critical)
- Partner may impose minimum volume commitments or exclusivity clauses
- Limited ability to innovate on product terms (e.g., custom cancellation windows)
- Revenue share terms may worsen as partner gains leverage (mitigate: multi-year contract with fixed terms)
- Long-term strategy: evaluate self-insurance (ЦБ license) at Series A stage when volume justifies the RUB 300M+ capital requirement
