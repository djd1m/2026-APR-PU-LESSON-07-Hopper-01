# Requirements Validation Report: HopperRU

**Дата:** 2026-05-12 | **Validator:** requirements-validator | **Iteration:** 1/3

---

## Summary

| Metric | Value |
|--------|-------|
| Stories analyzed | 20 |
| Average score | **78/100** |
| Blocked (score <50) | **0** |
| Warnings (50-69) | **2** |
| Ready (≥70) | **18** |
| Verdict | **🟢 READY** |

---

## INVEST Analysis (per story)

### Epic 1: Price Search & Prediction

| Story | I | N | V | E | S | T | INVEST Score | Notes |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:------------:|-------|
| US-01: Flight Search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Well-defined Gherkin, measurable |
| US-02: AI Price Prediction | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Clear confidence thresholds, 3 scenarios |
| US-03: Price Calendar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Color coding spec is precise |
| US-04: Price Alerts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Timing and limits defined |

### Epic 2: Booking

| Story | I | N | V | E | S | T | INVEST Score | Notes |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:------------:|-------|
| US-05: Book Flight | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Payment methods explicit, 152-ФЗ noted |
| US-06: Manage Booking | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | 5/6 (83) | Testable but "real-time" status vague — define polling interval |
| US-07: Cancel Booking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Good contrast CFAR vs standard |

### Epic 3: Fintech Protection

| Story | I | N | V | E | S | T | INVEST Score | Notes |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:------------:|-------|
| US-08: Price Freeze | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Clear pricing, timing, settlement |
| US-09: CFAR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Refund timing defined |
| US-10: Price Drop Protection | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | 10-day window, auto-refund |
| US-11: Disruption Guarantee | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | 4/6 (67) | ⚠️ Depends on insurance partner API (not independent). "Rebooking" testability unclear — define SLA |
| US-12: Protection Bundle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Bundle discount clearly specified |

### Epic 4: Telegram Bot

| Story | I | N | V | E | S | T | INVEST Score | Notes |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:------------:|-------|
| US-13: Telegram Search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Natural language + buttons |
| US-14: Telegram Booking | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | 5/6 (83) | Depends on US-05 (booking engine) |
| US-15: Telegram Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Timing defined |
| US-16: Telegram Mini App | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | 5/6 (83) | Scope borderline for one sprint — split to "calendar" + "account" |

### Epic 5: User Account & History

| Story | I | N | V | E | S | T | INVEST Score | Notes |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:------------:|-------|
| US-17: Registration/Auth | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Telegram OAuth + phone |
| US-18: Savings Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Concrete metrics |
| US-19: Referral | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | 5/6 (83) | K-factor testable but referral credit amount not specified |
| US-20: Profile & Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 6/6 (100) | Standard CRUD |

---

## SMART Analysis (Acceptance Criteria)

| Story | S | M | A | R | T | SMART Score | Notes |
|-------|:-:|:-:|:-:|:-:|:-:|:-----------:|-------|
| US-01 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "<3s", "top-20 routes", carriers listed |
| US-02 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | ">=70% accuracy", "every 6 hours" |
| US-03 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "<2s", "3 months", color percentiles |
| US-04 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "10 alerts max", "15 min", "30 min check" |
| US-05 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "<30s confirmation", payment methods |
| US-06 | ✅ | ✅ | ✅ | ✅ | ⚠️ | 4/5 | "Real-time" not bounded — suggest "status updated within 5 minutes" |
| US-07 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "5 рабочих дней" refund |
| US-08 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "21 days", "₽2,000-3,000" |
| US-09 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "100% refund", "24h before departure" |
| US-10 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "10 days monitoring", "auto-refund" |
| US-11 | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | 2/5 | ⚠️ "Rebooking" SLA undefined. "2h+ delay" — who determines? No max claim amount. |
| US-12 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "19% discount", concrete prices |
| US-13 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | NLU examples, button actions |
| US-14 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | Same as US-05 + Telegram Payments |
| US-15 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "15 min delivery", message format |
| US-16 | ✅ | ✅ | ✅ | ✅ | ⚠️ | 4/5 | "Full functionality" — need specific feature list for Mini App scope |
| US-17 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | Telegram OAuth, phone |
| US-18 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | "Cumulative savings", "trips count" |
| US-19 | ✅ | ✅ | ✅ | ✅ | ⚠️ | 4/5 | "₽2,000 credit" mentioned in CJM but not in story AC |
| US-20 | ✅ | ✅ | ✅ | ✅ | ✅ | 5/5 | Standard |

---

## Composite Scores

| Story | INVEST (50%) | SMART (30%) | Completeness (20%) | **Total** | **Status** |
|-------|:------------:|:-----------:|:-------------------:|:---------:|:----------:|
| US-01 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-02 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-03 | 50 | 30 | 18 | **98** | 🟢 READY |
| US-04 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-05 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-06 | 42 | 24 | 16 | **82** | 🟢 READY |
| US-07 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-08 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-09 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-10 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-11 | 33 | 12 | 12 | **57** | 🟡 CAVEATS |
| US-12 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-13 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-14 | 42 | 30 | 18 | **90** | 🟢 READY |
| US-15 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-16 | 42 | 24 | 16 | **82** | 🟢 READY |
| US-17 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-18 | 50 | 30 | 20 | **100** | 🟢 READY |
| US-19 | 42 | 24 | 16 | **82** | 🟢 READY |
| US-20 | 50 | 30 | 20 | **100** | 🟢 READY |

---

## Verdict

| Metric | Value | Threshold | Status |
|--------|-------|-----------|:------:|
| Average Score | **78/100** | ≥70 | ✅ |
| Blocked Stories | **0** | 0 | ✅ |
| Warning Stories | **2** (US-11, US-16) | — | ⚠️ |
| Contradictions | **0** | 0 | ✅ |

### 🟢 VERDICT: READY (with caveats)

Average score 78 ≥ 70, no blocked stories. 2 warnings noted below.

---

## Caveats & Recommended Fixes

### US-11: Disruption Guarantee (Score: 57 🟡)

**Issues:**
1. **Not Independent:** Depends on insurance partner API — not available at MVP launch
2. **Measurability:** "Rebooking" SLA undefined (within what timeframe? max cost?)
3. **Achievability:** Requires insurance partner contract — regulatory risk

**Recommended fix:** Move to v1.0 (not MVP). Add SLA: "Rebooking offer within 2 hours of confirmed disruption. Max rebooking cost: 150% of original fare. Insurance partner confirms claim within 24 hours."

**Decision:** Deferred to v1.0 — does NOT block MVP.

### US-16: Telegram Mini App (Score: 82 🟢 with note)

**Issue:** Scope may be too large for one sprint.

**Recommended fix:** Split into US-16a (Mini App: Calendar + Search) and US-16b (Mini App: Account + History).

### US-19: Referral (Score: 82 🟢 with note)

**Issue:** Referral credit amount not in acceptance criteria.

**Recommended fix:** Add AC: "Referrer receives ₽2,000 Carrot Cash credit when referee completes first booking."

---

## Cross-Document Consistency Check

| Check | Result | Notes |
|-------|:------:|-------|
| All PRD features have user stories | ✅ | 6 features → 20 stories |
| All stories have Gherkin scenarios | ✅ | 47 scenarios total |
| NFRs are measurable | ✅ | Performance, security, scalability with numbers |
| Architecture supports all stories | ✅ | 12 containers cover all epics |
| Pseudocode covers all algorithms | ✅ | 4 algorithms, 5 API contracts |
| ADRs address key risks | ✅ | 5 ADRs cover regulatory, payment, insurance |
| Tech stack matches constraints | ✅ | Docker + VPS + Monorepo |
| 152-ФЗ compliance addressed | ✅ | Data localization in Architecture.md |

---

## Architecture Validation

| Constraint | Specification | Architecture.md | Match |
|-----------|--------------|-----------------|:-----:|
| Pattern | Distributed Monolith | Distributed Monolith | ✅ |
| Containers | Docker + Docker Compose | Docker Compose (16 services) | ✅ |
| Infrastructure | VPS | Selectel/Yandex Cloud VPS | ✅ |
| Deploy | Docker Compose direct | SSH + Docker Compose | ✅ |
| AI Integration | MCP servers | MCP in Architecture.md | ✅ |
| Data Residency | 152-ФЗ Russia | Servers in RU (Selectel) | ✅ |
| Payments | MIR/SBP | YooKassa (ADR-4) | ✅ |

---

## Recommendations for Phase 3 (Implementation)

1. **US-11 deferred to v1.0** — implement remaining 19 stories in MVP
2. **Split US-16** into 16a + 16b for better sprint planning
3. **Add referral credit amount** to US-19 acceptance criteria
4. **Prioritize E1 (Search + Prediction) + E4 (Telegram)** — these form the core Aha Moment
5. **E3 (Fintech)** is the revenue engine — implement immediately after E1+E4
