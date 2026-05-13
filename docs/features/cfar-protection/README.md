# Feature: Cancel For Any Reason Protection

**ID:** cfar-protection
**Priority:** mvp
**Epic:** E3
**Status:** Done
**Branch:** feature/009-cfar-protection
**Stories:** US-09

## Overview

Insurance-backed protection product that provides 100% refund of the flight price (excluding the CFAR premium) when a user cancels their booking for any reason before departure. Premium is calculated as 12% of flight price, clamped between 1,500 and 5,000 RUB. Refund processing takes 5 business days.

## Architecture Decision

- **Percentage-based premium with clamp:** 12% of flight price ensures proportional pricing while the 1,500-5,000 RUB clamp prevents both absurdly low premiums on cheap flights and excessive premiums on expensive routes.
- **Integrated into booking flow:** CFAR is selected during booking creation and stored as a Protection record, not as a separate product.
- **Automatic cancellation handling:** When a booking with active CFAR is cancelled, the system automatically calculates full refund and marks the protection as PAID_OUT.

## Implementation

### Files Changed

- `packages/api/src/booking/booking.service.ts` -- CFAR premium calculation (calculateCfarPremium), cancellation with CFAR refund logic
- `packages/api/src/booking/booking.dto.ts` -- ProtectionRequestDto with 'cancel_for_any_reason' type
- `packages/api/src/fintech/fintech.service.ts` -- createProtection for post-booking CFAR addition
- `packages/web/src/app/booking/[id]/page.tsx` -- CFAR checkbox in booking UI with price display

### Key Components

- **calculateCfarPremium()** -- `Math.max(1500, Math.min(5000, Math.round(flightPrice * 0.12)))`
- **BookingService.cancelBooking()** -- Checks for active CFAR protection; if found: refund = totalPrice - cfarPremium, processing = 5 days; marks protection as PAID_OUT with claim_amount
- **ProtectionCheckbox** -- UI component showing "Cancel for Any Reason" with description and premium price

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bookings` | Bearer | Create booking with CFAR protection (via protections array) |
| POST | `/bookings/:id/cancel` | Bearer | Cancel with automatic CFAR refund |
| POST | `/fintech/protect` | Bearer | Add CFAR to existing booking |

## Data Model

- **Protection** -- booking_id, type=CANCEL_FOR_ANY_REASON, premium_paid, status (ACTIVE/CLAIMED/PAID_OUT/EXPIRED/VOIDED), claim_amount

## Dependencies

- **booking-engine** -- CFAR is attached to bookings and evaluated during cancellation

## Testing

1. Create booking with `protections: [{ type: "cancel_for_any_reason" }]` -- verify premium in breakdown
2. Cancel booking with active CFAR -- verify full refund (total - premium), cfar_used=true, processing_days=5
3. Cancel booking without CFAR -- verify 50% refund, cfar_used=false, processing_days=10
4. Verify CFAR premium bounds: 1,500 RUB minimum, 5,000 RUB maximum
5. Verify protection status transitions: ACTIVE -> PAID_OUT on cancellation, ACTIVE -> VOIDED on non-CFAR cancellation

## Notes

- CFAR premium is non-refundable (excluded from refund amount)
- Insurance partner integration is pending; current implementation is self-insured
- After cancellation, all remaining ACTIVE protections on the booking are set to VOIDED
- CFAR must be purchased at booking time or shortly after via `/fintech/protect`
