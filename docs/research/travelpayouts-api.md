# Travelpayouts / Aviasales Data API Research

**Date:** 2026-05-12 | **Status:** Integrated (free tier) | **Decision:** Primary price data source for MVP

---

## 1. Overview

Travelpayouts is the affiliate and data platform behind Aviasales (4M+ MAU, largest Russian metasearch for flights -- [SimilarWeb](https://www.similarweb.com/website/aviasales.ru/)). It provides free API access to aggregated flight price data without requiring booking capabilities.

**Key distinction:** Travelpayouts Data API provides **historical and cached price data** (not real-time availability). For actual booking, we use Nemo.travel (see `nemo-travel-gds-integration.md`). Travelpayouts is our **price intelligence layer**.

**Official site:** [https://www.travelpayouts.com](https://www.travelpayouts.com)
**API docs:** [https://support.travelpayouts.com/hc/en-us/categories/200358578](https://support.travelpayouts.com/hc/en-us/categories/200358578)

---

## 2. API Tiers

| Feature | Data API (Free) | Flight Search API (White Label) |
|---------|:--------------:|:------------------------------:|
| **Cost** | Free | Requires 50,000+ MAU |
| **Data type** | Cached/historical prices | Real-time search results |
| **Authentication** | X-Access-Token header | X-Access-Token + partner approval |
| **Rate limit** | 200 requests/hour | Higher (negotiated) |
| **Booking** | No (redirect to Aviasales) | Yes (white-label) |
| **Our usage** | MVP price data + predictions | Phase 2 (when MAU threshold met) |

**Decision:** We use the free Data API for MVP. It provides sufficient price data for our AI prediction engine and calendar views. Real-time booking goes through Nemo.travel.

---

## 3. Data API Endpoints

### 3.1 Price Endpoints

| Endpoint | Description | Use Case |
|----------|-------------|----------|
| `GET /v1/prices/cheap` | Cheapest tickets for each destination from origin | "Where to fly cheap" discovery |
| `GET /v1/prices/calendar` | Cheapest prices by date for a route | Color-coded calendar (core UX feature) |
| `GET /v2/prices/latest` | Latest found prices (most recent cache) | Real-time-ish price display |
| `GET /v2/prices/month-matrix` | Price grid: 30 days x multiple routes | Month view planning |
| `GET /v2/prices/week-matrix` | Price grid: 7 days x departure dates | Flexible date search |
| `GET /v2/prices/nearest-places-matrix` | Prices from/to nearby airports | "Fly from nearby" feature |
| `GET /v1/airline-directions` | Popular routes for a specific airline | Airline-specific recommendations |
| `GET /v1/city-directions` | Popular routes from a city | "Where to fly from Moscow" |

### 3.2 Reference Data Endpoints

| Endpoint | Description | Records |
|----------|-------------|---------|
| `GET /data/airports.json` | All airports with IATA codes, coordinates | ~10,000 |
| `GET /data/airlines.json` | All airlines with IATA codes, names | ~1,500 |
| `GET /data/cities.json` | Cities with country codes, coordinates | ~15,000 |
| `GET /data/countries.json` | Countries with currency, language | ~250 |

---

## 4. Authentication

All requests require the `X-Access-Token` header:

```bash
curl -X GET \
  "https://api.travelpayouts.com/v1/prices/cheap?origin=MOW&destination=LED" \
  -H "X-Access-Token: YOUR_TOKEN_HERE"
```

Token is obtained after registration at [travelpayouts.com](https://www.travelpayouts.com). Free tier, no credit card required.

---

## 5. Rate Limits

| Tier | Limit | Reset Period | Notes |
|------|:-----:|:------------:|-------|
| Free Data API | 200 requests/hour | Rolling window | Sufficient for MVP |
| Per-endpoint | Varies | Some endpoints have stricter limits | Monitor 429 responses |

### 5.1 Rate Limit Strategy for Our Platform

| Phase | Estimated Requests/hr | Within Limit? | Strategy |
|-------|:---------------------:|:-------------:|----------|
| MVP (M1-3) | 50-100 | Yes | Direct API calls |
| Growth (M6) | 500-2,000 | No | Cache layer + batch prefetch |
| Scale (M12) | 5,000+ | No | Full caching + negotiate higher limits |

**Mitigation:** Implement aggressive caching (prices change slowly -- hourly refresh sufficient for Data API). Use Redis with TTL-based invalidation.

---

## 6. Response Format Examples

### 6.1 `/v1/prices/cheap` Response

```json
{
  "success": true,
  "data": {
    "LED": {
      "0": {
        "price": 3245,
        "airline": "SU",
        "flight_number": 34,
        "departure_at": "2026-07-01T06:35:00Z",
        "return_at": "2026-07-08T21:30:00Z",
        "expires_at": "2026-05-12T18:00:00Z",
        "number_of_changes": 0,
        "gate": "Aviasales",
        "found_at": "2026-05-12T10:23:00Z"
      }
    }
  },
  "currency": "RUB"
}
```

### 6.2 `/v1/prices/calendar` Response

```json
{
  "success": true,
  "data": {
    "2026-07-01": {
      "origin": "MOW",
      "destination": "LED",
      "price": 3245,
      "transfers": 0,
      "airline": "SU",
      "flight_number": 34,
      "departure_at": "2026-07-01T06:35:00Z",
      "return_at": "2026-07-08T21:30:00Z",
      "expires_at": "2026-05-12T18:00:00Z"
    },
    "2026-07-02": {
      "origin": "MOW",
      "destination": "LED",
      "price": 3890,
      "transfers": 0,
      "airline": "DP",
      "flight_number": 112
    }
  }
}
```

### 6.3 `/v2/prices/month-matrix` Response

```json
{
  "success": true,
  "data": [
    {
      "show_to_affiliates": true,
      "trip_class": 0,
      "origin": "MOW",
      "destination": "LED",
      "depart_date": "2026-07-01",
      "return_date": "2026-07-08",
      "number_of_changes": 0,
      "value": 3245,
      "found_at": "2026-05-12T10:23:00Z",
      "distance": 634,
      "actual": true
    }
  ]
}
```

---

## 7. How We Use Travelpayouts in Our Architecture

### 7.1 Use Cases

| Feature | Endpoint(s) Used | Frequency |
|---------|-----------------|-----------|
| **Price Prediction Calendar** (core UX) | `/v1/prices/calendar` + `/v2/prices/month-matrix` | On search + hourly refresh |
| **"Where to fly cheap"** discovery | `/v1/prices/cheap` + `/v1/city-directions` | Daily prefetch for top cities |
| **Flexible date search** | `/v2/prices/week-matrix` | On user request |
| **Nearby airports** | `/v2/prices/nearest-places-matrix` | On search (if enabled) |
| **Price trend analysis** (for ML) | Historical `/v2/prices/latest` polling | Hourly batch job |
| **Reference data** | `airports.json`, `airlines.json`, `cities.json` | Daily sync |

### 7.2 Data Flow

```
[Travelpayouts Data API]
    |
    | (hourly batch + on-demand)
    v
[Price Data Collector Service]
    |
    +---> [Redis Cache] (hot prices, TTL 1hr)
    +---> [PostgreSQL] (historical prices for ML training)
    |
    v
[Price Prediction Engine]
    |
    | Phase 1: Rule-based (70% accuracy)
    | Phase 2: ML model (85%+ accuracy)
    | Phase 3: Deep learning (95% target)
    |
    v
[User-facing Calendar + Recommendations]
```

### 7.3 Relationship with Nemo.travel

```
Travelpayouts Data API     Nemo.travel Agent API
(Price Intelligence)       (Booking Engine)
    |                          |
    v                          v
[Show prices +             [Actual search +
 predictions +              book + ticket +
 calendar]                  cancel]
    |                          |
    +---------> User <---------+
```

- **Travelpayouts:** "Flight MOW->LED costs ~3,245 RUB, and our AI predicts it will drop 8% in 3 days"
- **Nemo.travel:** "Here is the actual live fare. Click to book. Ticket issued."

---

## 8. Limitations and Workarounds

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Cached prices (not real-time) | Prices may be stale by hours | Show "approximate" label; final price from Nemo.travel |
| 200 req/hr rate limit | Insufficient at scale | Aggressive caching + batch prefetch |
| No booking capability (free tier) | Cannot complete transactions | Use Nemo.travel for booking |
| No train prices | Missing railway data | Use RZD API directly or Nemo Railway |
| Price data may not match Nemo.travel | User confusion if prediction != actual | Clear UX: "estimated price" vs "final price" |

---

## 9. Flight Search API (Future -- 50K MAU)

Once we reach 50,000 MAU, we qualify for the Travelpayouts Flight Search API (White Label):

| Feature | Benefit |
|---------|---------|
| Real-time search results | Eliminates stale-price problem |
| White-label booking | Could replace or supplement Nemo.travel |
| Deeper airline data | Better prediction accuracy |
| Higher rate limits | Scales with traffic |

**Timeline estimate:** M9-M12 based on growth projections (Discovery Brief: 80K users at M9).

---

## Sources

| # | Source | URL | Accessed |
|---|--------|-----|----------|
| 1 | Travelpayouts official site | [https://www.travelpayouts.com](https://www.travelpayouts.com) | 2026-05-12 |
| 2 | Travelpayouts API documentation | [https://support.travelpayouts.com/hc/en-us/categories/200358578](https://support.travelpayouts.com/hc/en-us/categories/200358578) | 2026-05-12 |
| 3 | Aviasales Wikipedia | [https://en.wikipedia.org/wiki/Aviasales](https://en.wikipedia.org/wiki/Aviasales) | 2026-05-12 |
| 4 | SimilarWeb Aviasales traffic | [https://www.similarweb.com/website/aviasales.ru/](https://www.similarweb.com/website/aviasales.ru/) | 2026-05-12 |
| 5 | Travelpayouts Data API reference | [https://support.travelpayouts.com/hc/en-us/articles/203956163](https://support.travelpayouts.com/hc/en-us/articles/203956163) | 2026-05-12 |
| 6 | Phase 0 Discovery Brief (internal) | `docs/Phase0_Discovery_Brief.md` | 2026-05-12 |
| 7 | Phase 0 Fact Sheet (internal) | `docs/Phase0_Fact_Sheet.md` | 2026-05-12 |
