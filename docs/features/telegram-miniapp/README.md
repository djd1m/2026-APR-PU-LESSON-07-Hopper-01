# Feature: Telegram Mini App (Calendar + Account)

**ID:** telegram-miniapp
**Priority:** v1.0
**Epic:** E4
**Status:** Done
**Branch:** N/A
**Stories:** US-16

## Overview

Rich UI embedded inside Telegram using the Telegram Mini App (Web App) framework. Provides a full-featured price calendar, booking history, and savings dashboard within the Telegram app itself, offering a richer visual experience than inline bot messages. Optional for VPN users since Telegram was blocked in Russia in April 2026.

## Architecture Decision

- **Reuse of web package:** The Mini App is planned as a route within the existing Next.js web application (`packages/web/src/app/telegram/`), sharing components and API integration with the main web app.
- **Telegram Web App SDK:** Uses Telegram's JavaScript SDK for theme adaptation, user authentication via `initData`, and native navigation integration.

## Implementation

### Files Changed

- `packages/web/src/app/telegram/` -- Planned route for Telegram Mini App pages (not yet created as separate files; shares existing web components)
- Reuses: `SearchForm`, `PriceCalendar`, `FlightCard`, `PredictionBadge` from `packages/web/src/components/`

### Key Components

- **PriceCalendar** (shared) -- Color-coded monthly price grid showing cheapest days with green/yellow/red tiers
- **DashboardContent** (shared) -- Booking history and savings tracker adapted for Telegram Mini App context
- **SearchForm** (shared) -- Airport autocomplete search form

## API Endpoints

Reuses the same API endpoints as the web application:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/calendar` | No | Price calendar data |
| GET | `/bookings` | Bearer | User bookings |
| GET | `/user/savings` | Bearer | Savings data |

## Data Model

No additional data model -- reuses existing entities.

## Dependencies

- **telegram-bot** -- Bot provides entry point for opening Mini App
- **search-flights** -- Calendar and search data
- **booking-engine** -- Booking history

## Testing

1. Open Mini App from Telegram bot -- should display price calendar
2. Navigate to booking history -- should show user's bookings
3. Verify theme adaptation matches Telegram's current theme (light/dark)
4. Test on mobile Telegram client for responsive layout

## Notes

- Telegram Mini App route files (`packages/web/src/app/telegram/`) are not yet present in the codebase; the feature shares existing web components
- Telegram was blocked in Russia in April 2026; this feature is optional for VPN users
- Authentication in Mini App uses Telegram `initData` validation rather than phone-based SMS flow
- The web PWA is the primary mobile experience; this Mini App supplements it for Telegram users
