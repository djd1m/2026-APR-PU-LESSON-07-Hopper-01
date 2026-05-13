# Feature: Flight Booking Engine

**ID:** booking-engine
**Priority:** mvp
**Epic:** E2
**Status:** Done
**Branch:** feature/004-booking-engine
**Stories:** US-05, US-06, US-07

## Overview

Full-featured flight booking engine with passenger management, YooKassa payment simulation (MIR/SBP), PNR generation, protection add-ons, and cancellation with CFAR refund support. Implements a transactional booking flow that creates booking, booking items, passengers, and protections atomically.

## Architecture Decision

- **Transactional creation:** Booking, BookingItem, Passengers, and Protections are created in a single Prisma `$transaction` to ensure data consistency.
- **YooKassa payment simulation:** 90% success rate mock payment with generated payment IDs. Real YooKassa integration planned for production.
- **Price freeze integration:** Bookings can reference an active price freeze; user always gets the lower of frozen vs current market price.
- **Flight lookup via Redis:** Since flights are cached in Redis (from search), the booking service scans Redis search keys to find flight details.

## Implementation

### Files Changed

- `packages/api/src/booking/booking.service.ts` -- Core booking logic: create, list, get, cancel with CFAR
- `packages/api/src/booking/booking.controller.ts` -- REST endpoints with JWT auth guard
- `packages/api/src/booking/booking.dto.ts` -- DTOs: CreateBookingDto (passengers, protections, payment), CancelBookingDto, response DTOs
- `packages/api/src/booking/booking.module.ts` -- NestJS module
- `packages/web/src/app/booking/[id]/page.tsx` -- Booking page with passenger forms, payment selection, protection checkboxes, PNR confirmation
- `packages/web/src/components/ProtectionCheckbox.tsx` -- Protection option UI component

### Key Components

- **BookingService** -- Orchestrates the booking flow: flight validation, price freeze application, protection cost calculation, payment simulation, PNR generation, and transactional DB write
- **BookingPage** -- React booking flow: flight info display, passenger form (name, DOB, passport, nationality), payment method selection (MIR/SBP/Telegram), protection toggles, total calculation, PNR confirmation screen

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bookings` | Bearer | Create booking with passengers, protections, and payment |
| GET | `/bookings` | Bearer | List all bookings for authenticated user |
| GET | `/bookings/:id` | Bearer | Get booking details with flights, passengers, protections |
| POST | `/bookings/:id/cancel` | Bearer | Cancel booking (CFAR full refund or 50% standard refund) |

## Data Model

- **Booking** -- user_id, type (FLIGHT/HOTEL/TRAIN), status (PENDING to REFUNDED), total_price, currency, payment_id, payment_method, pnr, confirmed_at, cancelled_at, cancellation_reason
- **BookingItem** -- booking_id, flight_id, hotel_id, price, currency
- **Passenger** -- booking_id, first_name, last_name, passport_number (10 digits), date_of_birth, nationality (2-char code)
- **Protection** -- booking_id, type (CFAR/PRICE_DROP/FLIGHT_DISRUPTION), premium_paid, status, claim_amount

## Dependencies

- **search-flights** -- Flight data from Redis cache
- **auth-system** -- JWT authentication for all booking endpoints

## Testing

1. Create booking: POST with flight_id, passenger data, payment_method=sbp -- should return confirmed booking with PNR
2. Verify payment failure handling (10% mock failure rate)
3. List bookings: GET `/bookings` should return all user bookings with nested data
4. Cancel with CFAR: booking with active CFAR should get full refund minus premium, 5-day processing
5. Cancel without CFAR: should get 50% refund, 10-day processing
6. Verify price freeze usage: booking with freeze_id should use MIN(frozen, current) price
7. Verify passport validation: 10-digit pattern enforcement

## Notes

- PNR is a mock 6-character alphanumeric code (e.g., "A3X7K9")
- Payment IDs follow YooKassa format: `yookassa_{timestamp}_{random}`
- CFAR premium: 12% of flight price, clamped 1,500-5,000 RUB
- Price Drop premium: flat 1,500 RUB
- Cancellation voids all remaining active protections
- Payment methods: MIR card, SBP (QR code), Telegram Payments
