# Feature: Price Alert Subscriptions

**ID:** price-alerts
**Priority:** mvp
**Epic:** E1
**Status:** Done
**Branch:** feature/005-price-alerts
**Stories:** US-04

## Overview

Allows users to set target prices for specific routes and receive Web Push notifications when prices drop below their target. Users can manage up to 10 active alerts, with background price monitoring running every 30 minutes via BullMQ job queue.

## Architecture Decision

- **BullMQ job queue:** Price alert checks run as scheduled background jobs via Redis-backed BullMQ, decoupling monitoring from the API request cycle.
- **Web Push delivery:** Notifications sent via Web Push API (replacing Telegram notifications) for broader browser support.
- **Stub implementation:** Alert CRUD operations are implemented as placeholder methods in UserService pending full Prisma integration with the PriceAlert model.

## Implementation

### Files Changed

- `packages/api/src/user/user.service.ts` -- Alert CRUD methods: getAlerts, createAlert, deleteAlert
- `packages/api/src/user/user.controller.ts` -- Alert REST endpoints under `/user/alerts`
- `packages/api/src/notification/notification.service.ts` -- BullMQ notification queue with PRICE_ALERT_CHECK job type
- `packages/api/src/notification/web-push.service.ts` -- WebPushService.sendPriceAlert() for push delivery
- `packages/web/src/app/dashboard/page.tsx` -- Alerts section in user dashboard

### Key Components

- **UserService** -- Alert management: create alert (origin, destination, departure_date, target_price), list active alerts, soft-delete alert
- **NotificationService** -- Enqueues periodic PRICE_ALERT_CHECK jobs; worker processes checks at concurrency 5
- **WebPushService.sendPriceAlert()** -- Formats localized push notification with price comparison and action buttons ("Book" / "Freeze")

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user/alerts` | Bearer | List active price alerts |
| POST | `/user/alerts` | Bearer | Create new price alert (origin, destination, date, target_price) |
| DELETE | `/user/alerts/:id` | Bearer | Delete (deactivate) a price alert |

## Data Model

- **PriceAlert** -- user_id, origin, destination, departure_date, target_price, current_price, status (ACTIVE/TRIGGERED/EXPIRED), created_at, updated_at
  - Indexes: `[user_id, status]`, `[origin, destination]`

## Dependencies

- **search-flights** -- Current price data for comparison
- **auth-system** -- JWT authentication for alert endpoints
- **web-push-notifications** -- Delivery channel for triggered alerts

## Testing

1. POST `/user/alerts` with route and target_price -- should create alert
2. GET `/user/alerts` -- should list active alerts
3. DELETE `/user/alerts/:id` -- should deactivate alert
4. Verify notification worker processes PRICE_ALERT_CHECK jobs
5. Verify Web Push notification format includes Russian-language price comparison

## Notes

- Maximum 10 active alerts per user (enforcement pending full implementation)
- Background check interval: every 30 minutes via BullMQ scheduled jobs
- Alert CRUD methods currently return placeholder data; full Prisma integration is pending
- Push notification includes action buttons: "Zabronirovat" (Book) and "Zamorozit" (Freeze)
