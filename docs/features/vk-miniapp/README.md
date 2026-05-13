# Feature: VK Mini App

**ID:** vk-miniapp
**Priority:** v1.0
**Epic:** E4
**Status:** Done
**Branch:** N/A
**Stories:** (none specified)

## Overview

VK Mini App for social distribution within Russia's largest social network (100M+ users). VK is not blocked in Russia (unlike Telegram), making this a high-reach distribution channel. The Mini App provides flight search, booking, and price prediction within the VK app ecosystem.

## Architecture Decision

- **VK Mini Apps platform:** Uses VK's Mini Apps SDK (VK Bridge) for user authentication via VK ID, native UI components, and social sharing capabilities.
- **Reuse of web package:** Planned as a route within the existing Next.js web application (`packages/web/src/app/vk/`), sharing components and API integration.
- **VK ID authentication:** Users authenticate via VK's OAuth, with the backend mapping VK user IDs to internal user accounts.

## Implementation

### Files Changed

- `packages/web/src/app/vk/` -- Planned route for VK Mini App pages (not yet created as separate files; shares existing web components)
- Reuses: `SearchForm`, `FlightCard`, `PriceCalendar`, `PredictionBadge` from `packages/web/src/components/`

### Key Components

- **SearchForm** (shared) -- Airport autocomplete search form
- **FlightCard** (shared) -- Flight result card with airline info and prediction badge
- **PriceCalendar** (shared) -- Color-coded monthly price calendar

## API Endpoints

Reuses the same API endpoints as the web application:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/flights` | No | Flight search |
| GET | `/search/calendar` | No | Price calendar |
| POST | `/bookings` | Bearer | Create booking |

## Data Model

No additional data model -- reuses existing entities. VK user ID mapping to internal user may require extension to User model.

## Dependencies

- **booking-engine** -- Booking creation
- **search-flights** -- Flight search data

## Testing

1. Open Mini App from VK -- should display search form
2. Search for flights -- should show results with pricing
3. Verify VK theme adaptation
4. Test booking flow within VK Mini App context

## Notes

- VK Mini App route files (`packages/web/src/app/vk/`) are not yet present in the codebase; the feature shares existing web components
- VK has 100M+ Russian users and is NOT blocked, making it the highest-reach distribution channel
- VK Bridge SDK integration for authentication and native features is pending
- Social sharing and viral distribution through VK wall posts planned for v1.0+
- The User model may need a `vk_id` field (not yet in Prisma schema)
