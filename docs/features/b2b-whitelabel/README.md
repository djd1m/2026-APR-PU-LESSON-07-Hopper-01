# Feature: B2B White-Label Platform (HTS analog)

**ID:** b2b-whitelabel
**Priority:** v2.0
**Epic:** E6
**Status:** Done
**Branch:** N/A
**Stories:** (none specified)

## Overview

White-label travel portal for banks and fintech partners, enabling them to offer HopperRU's flight search, booking, and fintech protection products under their own brand. Analogous to Hopper Technology Solutions (HTS) in the US market. Partners get a customizable travel booking interface integrated into their banking or fintech apps.

## Architecture Decision

- **Multi-tenant architecture:** B2B platform will support multiple partner tenants, each with their own branding, pricing rules, and commission structure.
- **API-first integration:** Partners integrate via the existing REST API with partner-specific API keys, revenue share tracking, and white-label configuration.
- **Shared product core:** All booking, search, prediction, and fintech protection functionality is shared from the core platform; only branding and commission layers differ.

## Implementation

### Files Changed

- B2B-specific modules (`packages/api/src/b2b/`) are planned but not yet implemented as separate source files
- Will extend existing API with partner authentication, branding configuration, and commission tracking

### Key Components

Planned:

- **B2B Partner Service** -- Partner registration, API key management, branding configuration
- **Commission Tracker** -- Revenue share calculation and reporting per partner
- **White-Label Config** -- Theme colors, logos, partner-specific pricing rules
- **Partner Dashboard** -- Admin panel for partners to view bookings, revenue, and analytics

## API Endpoints

Planned:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/b2b/partners` | Admin | Register new B2B partner |
| GET | `/b2b/partners/:id/dashboard` | Partner | Partner analytics dashboard |
| GET | `/b2b/partners/:id/bookings` | Partner | Partner's customer bookings |
| POST | `/b2b/search/flights` | Partner API Key | White-label flight search |
| POST | `/b2b/bookings` | Partner API Key | White-label booking creation |

## Data Model

Planned extensions:

- **Partner** -- name, api_key, branding (JSON), commission_rate, status, created_at
- **PartnerBooking** -- partner_id, booking_id, commission_amount, settled

## Dependencies

- **booking-engine** -- Core booking functionality
- **protection-bundle** -- Fintech protection products for partner offerings

## Testing

1. B2B module testing pending implementation
2. Partner API key authentication testing
3. Commission calculation verification
4. White-label branding configuration testing

## Notes

- B2B module (`packages/api/src/b2b/`) does not yet exist in the codebase
- This is a v2.0 feature with the largest estimated effort (XXL)
- Target partners: Russian banks (Sber, Tinkoff, Alfa), fintech apps, corporate travel platforms
- Revenue model: commission per booking + premium on fintech protection products
- HTS (Hopper Technology Solutions) is the reference model from the US market
- Will require partner onboarding flow, contract management, and settlement system
