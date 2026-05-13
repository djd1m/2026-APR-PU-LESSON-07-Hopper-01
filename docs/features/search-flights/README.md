# Feature: Flight Search Engine

**ID:** search-flights
**Priority:** mvp
**Epic:** E1
**Status:** Done
**Branch:** main
**Stories:** US-01

## Overview

Core flight search engine that queries airline APIs (Travelpayouts) and generates realistic mock data as fallback. Supports 20 Russian domestic airports across 5 major airlines (Aeroflot, S7, Pobeda, Ural Airlines, Rossiya). Includes a color-coded price calendar showing cheapest days per month.

## Architecture Decision

- **Dual data source strategy:** Travelpayouts API as primary source with deterministic mock flight generation as fallback, ensuring the system always returns results even without API credentials.
- **Redis caching:** Search results cached for 5 minutes, calendar data for 30 minutes, reducing API calls and improving response times.
- **Seeded pseudo-random generation:** Mock flights use deterministic seeded randomness so the same query always returns the same results, enabling consistent cache behavior.

## Implementation

### Files Changed

- `packages/api/src/search/search.service.ts` -- Core search logic with mock generation and caching
- `packages/api/src/search/search.controller.ts` -- REST endpoints with Swagger documentation
- `packages/api/src/search/search.dto.ts` -- Request/response DTOs with validation (20 supported IATA codes)
- `packages/api/src/search/search.module.ts` -- NestJS module registration
- `packages/api/src/search/travelpayouts.service.ts` -- Travelpayouts Data API client
- `packages/web/src/components/SearchForm.tsx` -- Airport autocomplete search form
- `packages/web/src/components/FlightCard.tsx` -- Flight result card with airline info and prediction badge
- `packages/web/src/components/PriceCalendar.tsx` -- Color-coded monthly price calendar
- `packages/web/src/app/search/page.tsx` -- Search results page

### Key Components

- **SearchService** -- Orchestrates search with cache-first strategy, Travelpayouts fallback, and mock data generation
- **TravelpayoutsService** -- External API client using `/v1/prices/cheap` and `/v2/prices/latest` endpoints
- **SearchForm** -- React component with airport autocomplete filtering, swap button, date/passenger selection
- **PriceCalendar** -- Calendar grid with green/yellow/red tier coloring based on price percentiles

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/flights` | No | Search flights by origin, destination, date, passengers, cabin class |
| GET | `/search/calendar` | No | Get price calendar for route and month (YYYY-MM) |
| GET | `/search/flights/:id` | No | Get single flight details by ID |

## Data Model

- **Flight** (Prisma) -- airline, flight_number, origin, destination, departure_at, arrival_at, duration_min, cabin_class, stops, available_seats, price, currency, source
- **PriceHistory** -- origin, destination, departure_date, price, airline, observed_at (for trend analysis)

## Dependencies

None -- this is a foundational feature.

## Testing

1. `GET /search/flights?origin=SVO&destination=AER&departure_date=2026-07-15` should return 5-15 flights sorted by price
2. `GET /search/calendar?origin=SVO&destination=AER&month=2026-07` should return 28-31 days with green/yellow/red tiers
3. Verify Redis caching by checking `metadata.cached` field on second request
4. Test with `TRAVELPAYOUTS_TOKEN` set to verify real API integration
5. Verify all 20 supported airport codes are accepted; unsupported codes should return validation error

## Notes

- Route distances are hardcoded for 30+ major Russian domestic routes; unknown routes use hash-based estimate
- Price factors include advance purchase discount (>60 days: -30%), weekend premium (+12%), seasonal adjustments (summer +30%), and New Year surge (+40-60%)
- Mock flights generate 5-15 results with realistic timing (06:00-22:00 departures) and pricing
- Travelpayouts uses city codes (SVO/DME/VKO all map to MOW) for broader search results
