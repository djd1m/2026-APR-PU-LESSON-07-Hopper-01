# Feature: Flight Disruption Guarantee

**ID:** disruption-guarantee
**Priority:** v1.0
**Epic:** E3
**Status:** Done
**Branch:** N/A
**Stories:** US-11

## Overview

Insurance-backed protection that provides automatic rebooking when a flight is delayed by 2+ hours. Requires integration with an insurance partner for claims processing and airline disruption data feeds. Part of the fintech protection suite alongside CFAR and Price Drop.

## Architecture Decision

- **Insurance partner dependency:** Unlike CFAR and Price Drop which can be self-insured for MVP, disruption guarantee requires an external insurance partner for claims underwriting and airline delay data.
- **ProtectionType enum:** FLIGHT_DISRUPTION is defined in the Prisma schema as a ProtectionType enum value, ready for implementation.
- **Shared fintech infrastructure:** Uses the same Protection model, FintechService, and notification pipeline as other protection products.

## Implementation

### Files Changed

- `packages/db/prisma/schema.prisma` -- ProtectionType enum includes FLIGHT_DISRUPTION
- `packages/api/src/fintech/fintech.service.ts` -- createProtection supports flight_disruption type (placeholder)
- `packages/api/src/booking/booking.service.ts` -- Protection creation in booking transaction supports FLIGHT_DISRUPTION type
- `packages/api/src/notification/notification.service.ts` -- Notification infrastructure ready for disruption alerts

### Key Components

- **ProtectionType.FLIGHT_DISRUPTION** -- Prisma enum value defined and available
- **FintechService.createProtection()** -- Accepts flight_disruption in types array; returns placeholder response

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/fintech/protect` | Bearer | Add disruption guarantee to booking (via types array) |

## Data Model

- **Protection** -- booking_id, type=FLIGHT_DISRUPTION, premium_paid, status, claim_amount

## Dependencies

- **cfar-protection** -- Shares protection infrastructure and model

## Testing

1. Create booking with flight_disruption protection type -- should create Protection record
2. Verify ProtectionType.FLIGHT_DISRUPTION is recognized by the system
3. Verify protection appears in booking details response

## Notes

- Implementation is placeholder/stub; full functionality requires:
  - Insurance partner API integration for claims processing
  - Airline disruption data feed (OAG, FlightStats, or similar)
  - Auto-rebooking logic with alternative flight selection
  - Delay threshold monitoring (2+ hours)
- Premium pricing not yet determined; will depend on insurance partner rates
- The Telegram bot already translates FLIGHT_DISRUPTION to Russian: "Zashchita ot zaderzhki reysa"
