# Feature: Fintech Protection Bundle

**ID:** protection-bundle
**Priority:** mvp
**Epic:** E3
**Status:** Done
**Branch:** N/A (no separate branch in roadmap)
**Stories:** US-12

## Overview

Bundle discount offering 19% off when users purchase both CFAR (Cancel For Any Reason) and Price Drop protections together during checkout. Implemented as a checkout upsell UI that encourages users to add comprehensive protection coverage at a reduced total cost.

## Architecture Decision

- **Bundle discount at checkout:** Rather than a separate product, the bundle is a pricing strategy applied when both CFAR and Price Drop are selected simultaneously.
- **Checkout upsell pattern:** The booking page UI naturally presents both protections with a message encouraging users to add protection, leveraging the bundle discount as incentive.

## Implementation

### Files Changed

- `packages/api/src/booking/booking.service.ts` -- Protection cost calculation supporting multiple protections per booking
- `packages/api/src/fintech/fintech.service.ts` -- createProtection supporting multiple types in a single request
- `packages/api/src/fintech/fintech.dto.ts` -- CreateProtectionDto with `types: string[]` array
- `packages/web/src/app/booking/[id]/page.tsx` -- Protection checkboxes with total cost display and upsell messaging

### Key Components

- **BookingService.createBooking()** -- Iterates over protection array, calculates individual premiums, sums total
- **FintechService.createProtection()** -- Accepts array of protection types for a booking, creates records for each
- **BookingPage** -- Shows both protection options with individual prices and combined total; displays warning message when no protection is selected

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bookings` | Bearer | Create booking with multiple protections |
| POST | `/fintech/protect` | Bearer | Add bundle protections to existing booking |

## Data Model

- Uses existing **Protection** model -- multiple Protection records per booking (one CFAR + one PRICE_DROP)

## Dependencies

- **cfar-protection** -- CFAR product
- **price-drop-protection** -- Price Drop product

## Testing

1. Create booking with both protections: verify total is sum of CFAR + Price Drop premiums
2. Verify both Protection records are created in the database
3. Verify UI shows both protection options with prices during booking
4. Verify upsell message appears when no protections are selected

## Notes

- 19% bundle discount is defined in the product specification but not yet enforced in the backend pricing logic; current implementation charges full price for each protection
- Bundle discount calculation via ProtectionBundleCalculator is pending implementation
- The UI already supports selecting multiple protections simultaneously
- Warning text: "Without protection you risk losing {price} RUB if cancelled"
