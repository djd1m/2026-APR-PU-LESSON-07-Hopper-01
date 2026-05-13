# Feature: Hotel Search & Booking

**ID:** hotel-search
**Priority:** v1.0
**Epic:** E1
**Status:** Done
**Branch:** N/A
**Stories:** (none specified)

## Overview

Hotel search and booking functionality extending HopperRU beyond flights to become a comprehensive travel platform. Includes hotel search with price prediction for accommodations. The data model supports hotels via the BookingType.HOTEL enum and BookingItem.hotel_id field.

## Architecture Decision

- **BookingType enum:** The Prisma schema already defines `BookingType { FLIGHT, HOTEL, TRAIN }`, enabling multi-product bookings.
- **BookingItem extensibility:** BookingItem has both `flight_id` and `hotel_id` optional fields, allowing a single booking to contain mixed item types.
- **Shared booking infrastructure:** Hotel bookings will use the same Booking, BookingItem, Passenger, and Protection models as flights.

## Implementation

### Files Changed

- `packages/db/prisma/schema.prisma` -- BookingType.HOTEL enum, BookingItem.hotel_id field
- Hotel-specific search service, controller, and web pages are planned but not yet implemented as separate source files

### Key Components

- **BookingType.HOTEL** -- Prisma enum value enabling hotel bookings
- **BookingItem.hotel_id** -- Optional FK for hotel-specific booking items

## API Endpoints

Planned:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/hotels` | No | Search hotels by location and dates |
| GET | `/search/hotels/:id` | No | Get hotel details |
| POST | `/bookings` | Bearer | Create hotel booking (type: HOTEL) |

## Data Model

- **BookingType.HOTEL** -- Enum value in Prisma schema
- **BookingItem.hotel_id** -- Optional UUID reference to hotel entity (Hotel model pending)
- Hotel entity model (name, location, rating, rooms, pricing) is planned but not yet in schema

## Dependencies

- **booking-engine** -- Shared booking and payment infrastructure

## Testing

1. Verify BookingType.HOTEL enum is defined in Prisma schema
2. Verify BookingItem can be created with hotel_id
3. Hotel search and booking flow testing pending implementation

## Notes

- Hotel search service (`packages/api/src/search/hotel-search*`) does not yet exist in the codebase
- The data model is prepared (BookingType.HOTEL, BookingItem.hotel_id) but the full hotel entity, search service, and hotel supplier API integration are pending
- Hotel price prediction will reuse the prediction infrastructure with hotel-specific pricing factors
- Potential hotel data sources: Ostrovok, Bronevik, or Travelpayouts Hotel API
