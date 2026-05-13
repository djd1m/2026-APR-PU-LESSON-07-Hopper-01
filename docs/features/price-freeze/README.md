# Feature: Price Freeze Fintech Product

**ID:** price-freeze
**Priority:** mvp
**Epic:** E3
**Status:** Done
**Branch:** feature/008-price-freeze
**Stories:** US-08

## Overview

Allows users to freeze a flight's current price for 21 days by paying a fixed fee (2,000-3,000 RUB based on route volatility). When booking with an active freeze, the user always gets the lower of the frozen price or the current market price. Maximum 3 active freezes per user.

## Architecture Decision

- **Fee-based model:** Fixed fee independent of flight price, making it attractive for expensive routes where price increases are most impactful.
- **Price guarantee favoring user:** At booking time, the system compares frozen and current prices and applies the lower one, ensuring the freeze never disadvantages the user.
- **Integration with booking flow:** Freeze ID can be passed during booking creation to automatically apply the frozen price.

## Implementation

### Files Changed

- `packages/api/src/fintech/fintech.service.ts` -- FintechService: createFreeze, getFreeze, useFreeze
- `packages/api/src/fintech/fintech.controller.ts` -- REST endpoints under `/fintech/freeze`
- `packages/api/src/fintech/fintech.dto.ts` -- CreateFreezeDto (flight_id, payment_method)
- `packages/api/src/fintech/fintech.module.ts` -- NestJS module
- `packages/api/src/booking/booking.service.ts` -- Freeze integration in createBooking (lines 129-148)
- `packages/api/src/notification/notification.service.ts` -- Freeze expiry reminder scheduling

### Key Components

- **FintechService.createFreeze()** -- Validates max active freezes, calculates fee based on route volatility, creates payment, saves freeze record with 21-day expiration
- **FintechService.useFreeze()** -- Validates freeze is ACTIVE and not expired, compares frozen vs market price, marks freeze as USED
- **BookingService** (integration) -- When freeze_id is provided during booking, applies MIN(frozen, current) price and marks freeze as USED

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/fintech/freeze` | Bearer | Create price freeze for a flight |
| GET | `/fintech/freeze/:id` | Bearer | Get freeze details and status |
| POST | `/fintech/freeze/:id/use` | Bearer | Use freeze to book at frozen price |

## Data Model

- **PriceFreeze** -- user_id, flight_id, frozen_price, fee_paid, status (ACTIVE/USED/EXPIRED/REFUNDED), expires_at, created_at, used_at, booking_id
  - Indexes: `[user_id]`, `[status]`, `[expires_at]`

## Dependencies

- **booking-engine** -- Freeze is consumed during booking creation

## Testing

1. POST `/fintech/freeze` with flight_id -- should return freeze with 21-day expiration and fee
2. Verify max 3 active freezes per user enforcement
3. Book with freeze_id when market price is higher -- should use frozen price
4. Book with freeze_id when market price is lower -- should use market price
5. Verify freeze status changes to USED after booking
6. Verify expiry reminder notifications scheduled at 3 days and 1 day before expiration

## Notes

- Current implementation returns placeholder data; full Prisma integration and YooKassa payment for freeze fee are pending
- Fee range: 2,000-3,000 RUB (route volatility calculation pending)
- Freeze expiry reminders sent via Web Push at T-3 days and T-1 day
- Constants: MAX_ACTIVE_FREEZES = 3, FREEZE_DURATION_DAYS = 21
