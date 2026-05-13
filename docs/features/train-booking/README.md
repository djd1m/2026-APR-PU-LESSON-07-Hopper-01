# Feature: Train Ticket Booking (RZD/Sapsan)

**ID:** train-booking
**Priority:** v1.0
**Epic:** E1
**Status:** Done
**Branch:** N/A
**Stories:** (none specified)

## Overview

Train search and booking for Russian railways (RZD), including high-speed Sapsan service, extending HopperRU into multimodal travel. Includes price prediction for train routes. The data model supports train bookings via the BookingType.TRAIN enum.

## Architecture Decision

- **BookingType enum:** The Prisma schema already defines `BookingType { FLIGHT, HOTEL, TRAIN }`, enabling train bookings alongside flights and hotels.
- **Shared booking infrastructure:** Train bookings will use the same Booking, BookingItem, Passenger, and Protection models as flights, with train-specific fields added to BookingItem or a new TrainSegment model.
- **RZD API integration:** Will require integration with RZD's electronic ticketing API or an aggregator that provides Russian railway data.

## Implementation

### Files Changed

- `packages/db/prisma/schema.prisma` -- BookingType.TRAIN enum value

### Key Components

- **BookingType.TRAIN** -- Prisma enum value enabling train bookings

## API Endpoints

Planned:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/trains` | No | Search trains by route and date |
| GET | `/search/trains/:id` | No | Get train details |
| POST | `/bookings` | Bearer | Create train booking (type: TRAIN) |

## Data Model

- **BookingType.TRAIN** -- Enum value in Prisma schema
- Train entity model (train number, route, class, car type, seat selection) is planned but not yet in schema

## Dependencies

- **booking-engine** -- Shared booking and payment infrastructure

## Testing

1. Verify BookingType.TRAIN enum is defined in Prisma schema
2. Train search and booking flow testing pending implementation

## Notes

- Train search service (`packages/api/src/search/train-search*`) does not yet exist in the codebase
- The data model is prepared (BookingType.TRAIN) but the full train entity, search service, and RZD API integration are pending
- Key routes: Moscow-St.Petersburg (Sapsan, 4h), Moscow-Kazan, Moscow-Nizhny Novgorod
- Train price prediction will reuse the prediction infrastructure with train-specific pricing factors (advance purchase, class, peak hours)
- Potential data sources: RZD API, Tutu.ru aggregator
