# Feature: User Dashboard & Savings

**ID:** user-dashboard
**Priority:** mvp
**Epic:** E5
**Status:** Done
**Branch:** N/A
**Stories:** US-18, US-19, US-20

## Overview

Authenticated user dashboard showing booking history, cumulative savings tracker (from predictions and freezes), active price alerts, referral program link, and profile settings. The dashboard serves as the central hub for logged-in users to manage all their travel-related activity.

## Architecture Decision

- **Server-driven data:** Dashboard data is fetched from the API via React Query, enabling real-time updates and caching.
- **AuthGuard wrapper:** Dashboard page is wrapped in AuthGuard component that redirects unauthenticated users to `/auth`.
- **Savings aggregation:** Savings are calculated from multiple sources: freeze savings, prediction savings, and price drop refunds.

## Implementation

### Files Changed

- `packages/web/src/app/dashboard/page.tsx` -- Dashboard page with stats cards, bookings list, alerts list, referral section
- `packages/web/src/components/AuthGuard.tsx` -- Authentication wrapper component
- `packages/api/src/user/user.service.ts` -- getProfile, updateProfile, getSavings methods
- `packages/api/src/user/user.controller.ts` -- REST endpoints under `/user`

### Key Components

- **DashboardContent** -- React component with three stat cards (total savings, active bookings, active alerts), two-column grid (bookings list, alerts list), and referral section with copy-to-clipboard link
- **UserService.getSavings()** -- Aggregates savings from freeze_savings, prediction_savings, and price_drop_refunds (currently returns placeholder zeros)
- **AuthGuard** -- Checks authentication state and redirects to `/auth` if not logged in

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user/me` | Bearer | Get user profile with preferences |
| PATCH | `/user/me` | Bearer | Update user profile fields |
| GET | `/user/savings` | Bearer | Get cumulative savings breakdown |

## Data Model

- **User** -- profile fields: name, phone, email, home_airport, preferences (JSON with currency, timezone, language, notification_channels)

## Dependencies

- **auth-system** -- Authentication and user identity
- **booking-engine** -- Booking history data

## Testing

1. Access `/dashboard` without auth -- should redirect to `/auth`
2. Access `/dashboard` with valid token -- should display user data
3. Verify stat cards show correct counts: active bookings, alerts, total savings
4. Verify bookings list shows route, date, price, and color-coded status badge
5. Verify referral link is copyable and includes user's referral code
6. Verify profile update via PATCH `/user/me`

## Notes

- Savings calculation returns zeros until full aggregation logic is implemented
- Booking statuses are color-coded: CONFIRMED (green), PENDING (yellow), others (gray)
- Status translations: PENDING="Awaiting Payment", CONFIRMED="Confirmed", TICKETED="Ticket Issued", COMPLETED="Completed", CANCELLED="Cancelled"
- Referral program URL format: `https://hopperru.ru/ref/{referral_code}`
- Dashboard uses `@tanstack/react-query` for data fetching with automatic cache management
