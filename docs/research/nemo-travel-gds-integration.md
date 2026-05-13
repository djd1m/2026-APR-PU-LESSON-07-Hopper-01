# Nemo.travel GDS Integration Research

**Date:** 2026-05-12 | **Status:** Recommended for MVP | **Decision:** ADR-3

---

## 1. What is Nemo.travel

Nemo.travel is a Russian GDS (Global Distribution System) aggregator platform that provides unified API access to multiple airline reservation systems, hotel inventories, and railway booking engines. Founded and headquartered in Russia, it serves as a middleware layer between travel agencies/OTAs and global + domestic distribution systems.

Nemo.travel is particularly strong in the Russian market because it provides native integration with domestic GDS systems (Sirena-Travel, Mixvel) that international aggregators like Amadeus or Sabre do not support natively.

**Official site:** [https://nemo.travel](https://nemo.travel)
**Helpdesk:** [https://helpdesk.nemo.travel](https://helpdesk.nemo.travel)

---

## 2. Product Suite

| Product | Description | Relevance to Our Project |
|---------|-------------|-------------------------|
| **Nemo Planes** | Flight search, booking, ticketing across 400+ airlines | Core -- primary booking engine |
| **Nemo Hotel** | Hotel search and booking via multiple suppliers | Phase 2 -- hotel vertical |
| **Nemo Railway** | Russian railway booking (RZD/Sapsan integration) | High -- unique differentiator vs Hopper |
| **Nemo Connect** | API for third-party integrations | Primary integration method |

---

## 3. API Architecture

### 3.1 Agent API (REST/JSON)

Nemo.travel exposes a REST/JSON Agent API for programmatic access. This is the recommended integration path for our platform.

**Base endpoint:** `https://<instance>.nemo.travel/api/`

**Authentication:** API key + agent credentials (login/password or token-based)

### 3.2 Core Endpoints

| Endpoint | Method | Description | Latency |
|----------|--------|-------------|---------|
| `/search/flights` | POST | Multi-GDS flight search with fare comparison | 5-30s (depends on GDS count) |
| `/book` | POST | Create PNR (Passenger Name Record) | 2-5s |
| `/ticket` | POST | Issue e-ticket from confirmed PNR | 3-10s |
| `/cancel` | POST | Cancel booking / request refund | 2-5s |
| `/order/status` | GET | Check booking/ticketing status | <1s |
| `/search/hotels` | POST | Hotel availability search | 3-15s |
| `/search/railway` | POST | RZD train search | 2-8s |

### 3.3 Request/Response Format

```json
// Search request example
{
  "method": "flights.search",
  "params": {
    "segments": [
      {
        "departure": "MOW",
        "arrival": "LED",
        "date": "2026-06-15"
      }
    ],
    "passengers": {
      "adults": 1,
      "children": 0,
      "infants": 0
    },
    "class": "economy",
    "sources": ["sirena", "amadeus"]
  }
}
```

---

## 4. GDS Connections

### 4.1 Connected Distribution Systems

| GDS | Type | Coverage | Strength | Notes |
|-----|------|----------|----------|-------|
| **Sirena-Travel** | Domestic Russian GDS | All Russian airlines, CIS carriers | Mandatory for domestic routes | Only available through Russian aggregators |
| **Amadeus** | Global GDS | 400+ airlines worldwide | International coverage | Industry standard |
| **Mixvel** | NDC aggregator | NDC-enabled airlines | Modern API, lower fees | Growing adoption in Russia |
| **Travelfusion** | LCC aggregator | 300+ low-cost carriers | Budget airlines not in GDS | Fills gaps in Amadeus/Sirena |

### 4.2 Direct Airline Connections (Without GDS Fee)

Nemo.travel supports direct connections to airlines that offer NDC (New Distribution Capability) or proprietary APIs. This bypasses GDS fees entirely.

| Airline | Connection Type | Fee Savings |
|---------|----------------|-------------|
| Aeroflot | Direct NDC | No GDS surcharge ($3-8 saved/ticket) |
| S7 Airlines | Direct API | No GDS surcharge |
| Pobeda | Direct (LCC) | No GDS fee (LCC never in GDS) |
| Ural Airlines | Via Mixvel NDC | Reduced fees |

**Significance:** Direct connections reduce per-ticket costs by $3-8, which directly improves our unit economics (see Discovery Brief, Section M4).

---

## 5. Pricing

| Component | Cost | Notes |
|-----------|------|-------|
| **Monthly subscription** | $360-1,000/mo | Depends on traffic tier and GDS connections enabled |
| **Per-ticket fee** | ~$0.25/ticket | Charged on issued tickets only |
| **Per-search fee** | ~$0.00025/search | Negligible at low volumes; matters at scale |
| **Setup fee** | Varies | One-time; negotiable |
| **GDS pass-through** | Varies by GDS | Amadeus segments cost more than Sirena |

### 5.1 Cost Projection for Our Platform

| Phase | Monthly Searches | Tickets/mo | Nemo Cost/mo | Notes |
|-------|:----------------:|:----------:|:------------:|-------|
| MVP (M1-3) | 50,000 | 200 | ~$410-1,060 | Subscription + minimal usage |
| Growth (M6) | 500,000 | 2,000 | ~$985-1,625 | Search fees start to matter |
| Scale (M12) | 5,000,000 | 20,000 | ~$6,610-7,250 | Volume discounts available |
| Maturity (M24) | 20,000,000 | 80,000 | ~$25,360-26,000 | Negotiate enterprise pricing |

---

## 6. Connection Process

1. **Register** at [helpdesk.nemo.travel](https://helpdesk.nemo.travel)
2. **Submit application** with company details and planned traffic volumes
3. **Sign agreement** (typically 2-4 weeks)
4. **Receive sandbox credentials** for development/testing
5. **Integration development** (estimate 4-8 weeks for full flight flow)
6. **Certification testing** -- Nemo validates booking/ticketing flows
7. **Production launch** -- switch to live credentials

**Timeline estimate:** 6-12 weeks from application to first live booking.

---

## 7. Alternatives Comparison

| Criteria | Nemo.travel | Direct Amadeus | Direct Sabre | Kiwi Tequila API |
|----------|:-----------:|:--------------:|:------------:|:----------------:|
| Sirena-Travel access | Yes | No | No | No |
| Russian airline coverage | Excellent | Good | Good | Partial |
| Monthly cost (MVP) | $360-1,000 | $5,000-15,000 | $5,000-15,000 | Free (commission) |
| Per-ticket cost | ~$0.25 | $2-8 | $2-8 | 3-5% commission |
| Setup complexity | Medium | Very High | Very High | Low |
| Russian support | Yes (Russian) | English only | English only | English only |
| Railway (RZD) | Yes | No | No | No |
| NDC/Direct connections | Yes | Yes | Yes | Partial |
| Time to integrate | 6-12 weeks | 3-6 months | 3-6 months | 2-4 weeks |
| Data localization (152-FZ) | Compliant | Requires setup | Requires setup | Non-compliant |

---

## 8. Recommendation

**Nemo.travel is the recommended GDS integration for this project.** Rationale:

1. **Sirena-Travel access is mandatory** for Russian domestic flights -- no international GDS provides this natively, and domestic routes are our MVP focus (Discovery Brief, Section M3.D: "top-20 RU routes" strategy)
2. **Cost efficiency** -- 10-50x cheaper than direct Amadeus/Sabre integration at MVP volumes
3. **Russian language support** -- helpdesk and documentation in Russian, critical for fast iteration
4. **Railway integration** -- enables train booking (Tutu.ru competitor feature) from the same API
5. **152-FZ compliance** -- data stays within Russian infrastructure
6. **Aligned with our tech stack** -- REST/JSON API fits our React + Supabase architecture (Discovery Brief, Section M6.B)

**Tradeoffs:**
- Vendor lock-in risk (mitigate with abstraction layer in our booking service)
- Search latency 5-30s (mitigate with caching and async search patterns)
- Limited international coverage vs direct Amadeus (acceptable for domestic-first MVP)

---

## 9. Integration Architecture (Proposed)

```
User Request
    |
    v
[Our Search Service] --> Cache Layer (Redis)
    |                         |
    | (cache miss)            | (cache hit)
    v                         v
[Nemo.travel Agent API]   Return cached results
    |
    +-- Sirena-Travel (domestic)
    +-- Amadeus (international)
    +-- Mixvel/NDC (direct airlines)
    +-- Travelfusion (LCCs)
    |
    v
[Normalize + Rank + Price Predict]
    |
    v
Return to User
```

---

## Sources

| # | Source | URL | Accessed |
|---|--------|-----|----------|
| 1 | Nemo.travel official site | [https://nemo.travel](https://nemo.travel) | 2026-05-12 |
| 2 | Nemo.travel helpdesk / API docs | [https://helpdesk.nemo.travel](https://helpdesk.nemo.travel) | 2026-05-12 |
| 3 | Sirena-Travel (Russian GDS) | [https://sirena-travel.ru](https://sirena-travel.ru) | 2026-05-12 |
| 4 | Amadeus for Developers | [https://developers.amadeus.com](https://developers.amadeus.com) | 2026-05-12 |
| 5 | Mixvel NDC aggregator | [https://mixvel.com](https://mixvel.com) | 2026-05-12 |
| 6 | Travelfusion API | [https://travelfusion.com](https://travelfusion.com) | 2026-05-12 |
| 7 | Kiwi Tequila API | [https://tequila.kiwi.com](https://tequila.kiwi.com) | 2026-05-12 |
| 8 | IMARC Russia Online Travel Market | [https://www.imarcgroup.com/russia-online-travel-market](https://www.imarcgroup.com/russia-online-travel-market) | 2026-05-12 |
| 9 | Phase 0 Discovery Brief (internal) | `docs/Phase0_Discovery_Brief.md` | 2026-05-12 |
