# Feature: Price Drop Protection

**ID:** price-drop-protection
**Priority:** mvp
**Epic:** E3
**Status:** Done
**Branch:** feature/010-price-drop-protection
**Stories:** US-10

## Overview

Post-booking price monitoring product that tracks the flight price for 10 days after purchase and automatically refunds the difference if the price drops. Coverage is capped at 50% of the original booking price. Premium is a flat 1,500 RUB. Users receive Web Push notifications when a price drop is detected.

## Architecture Decision

- **Flat premium:** Simple 1,500 RUB pricing makes it easy for users to evaluate cost/benefit and keeps the checkout flow simple.
- **Automated monitoring:** Background job in NotificationService checks prices and triggers refund notifications without user intervention.
- **Coverage cap at 50%:** Limits exposure while still providing meaningful protection against significant price drops.

## Implementation

### Files Changed

- `packages/api/src/booking/booking.service.ts` -- Price drop premium calculation (calculatePriceDropPremium), protection creation in booking transaction
- `packages/api/src/booking/booking.dto.ts` -- ProtectionRequestDto with 'price_drop' type
- `packages/api/src/notification/notification.service.ts` -- PRICE_DROP_DETECTED job type and notification delivery
- `packages/api/src/notification/web-push.service.ts` -- Price drop notification formatting (not yet connected to auto-monitoring)
- `packages/web/src/app/booking/[id]/page.tsx` -- Price drop checkbox in booking UI

### Key Components

- **calculatePriceDropPremium()** -- Returns flat 1,500 RUB
- **NotificationService.sendPriceDropNotification()** -- Enqueues notification with old price, new price, and savings amount
- **ProtectionCheckbox** -- UI showing "Price Drop Protection" with description: "10-day monitoring, auto-refund difference up to 50%"

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bookings` | Bearer | Create booking with price_drop protection |
| POST | `/fintech/protect` | Bearer | Add price drop protection to existing booking |

## Data Model

- **Protection** -- booking_id, type=PRICE_DROP, premium_paid=1500, status (ACTIVE/CLAIMED/PAID_OUT/EXPIRED/VOIDED), claim_amount

## Dependencies

- **booking-engine** -- Protection is attached to bookings
- **search-flights** -- Current price data for monitoring

## Testing

1. Create booking with `protections: [{ type: "price_drop" }]` -- verify 1,500 RUB premium in breakdown
2. Verify protection coverage is capped at 50% of booking price
3. Verify PRICE_DROP_DETECTED notification includes old price, new price, and savings
4. Verify protection status transitions appropriately

## Notes

- Monitoring duration: 10 days post-booking
- Premium: flat 1,500 RUB regardless of flight price
- Maximum coverage: 50% of original booking price
- Automated price monitoring background job implementation is pending
- Price drop detection currently requires manual trigger; full background cron integration planned
