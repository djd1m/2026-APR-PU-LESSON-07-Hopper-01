# Feature: Nemo.travel GDS Integration

**ID:** nemo-travel-integration
**Priority:** v1.0
**Status:** Ready for activation (code complete, needs credentials)
**Branch:** feature/021-nemo-travel-integration

## Overview

Abstraction layer `BookingProvider` that supports two implementations:
- `MockBookingProvider` — current simulated booking (default)
- `NemoBookingProvider` — real GDS booking via Nemo.travel API

Switch via `BOOKING_PROVIDER=nemo` env var.

## Architecture Decision

**ADR-7: BookingProvider abstraction over direct GDS integration**

Reasons:
- Multiple GDS providers may be needed (Nemo, Amadeus, direct airline APIs)
- Mock provider essential for development/testing
- Runtime switching without code changes
- Each provider implements same interface: search → book → ticket → cancel

## Nemo.travel Connection

### Prerequisites
1. Sign contract with [Nemo.travel](https://www.nemo.travel/)
2. Apply at [helpdesk.nemo.travel](https://helpdesk.nemo.travel)
3. Receive: `NEMO_API_URL`, `NEMO_API_KEY`, `NEMO_AGENCY_ID`

### Cost
| Item | Price |
|------|-------|
| Base support (1 GDS) | $500/month |
| Per ticket | $0.25 |
| Per search query | $0.00025 (beyond 300/PNR quota) |
| Additional GDS | $1,200 one-time |

### Activation
```bash
# In .env:
BOOKING_PROVIDER=nemo
NEMO_API_URL=https://your-instance.nemo.travel/api
NEMO_API_KEY=your_api_key
NEMO_AGENCY_ID=your_agency_id
```

## Files
- `packages/api/src/booking/providers/booking-provider.interface.ts` — interface
- `packages/api/src/booking/providers/mock-booking.provider.ts` — mock (current)
- `packages/api/src/booking/providers/nemo-booking.provider.ts` — Nemo.travel
- `packages/api/src/booking/providers/index.ts` — factory + exports
- `packages/api/src/booking/booking.module.ts` — DI factory (reads BOOKING_PROVIDER env)
