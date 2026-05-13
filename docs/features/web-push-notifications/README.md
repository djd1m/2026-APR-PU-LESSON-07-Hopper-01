# Feature: Web Push Notifications

**ID:** web-push-notifications
**Priority:** mvp
**Epic:** E4
**Status:** Done
**Branch:** feature/007-web-push-notifications
**Stories:** US-15

## Overview

Browser push notification system using the Web Push API with VAPID authentication. Delivers real-time notifications for price alerts, booking confirmations, booking status changes, and price drop detection. Replaces Telegram as the primary notification channel for broader reach. Users can subscribe from multiple devices/browsers.

## Architecture Decision

- **VAPID-based Web Push:** Uses the `web-push` npm library with VAPID keys for server-to-browser push delivery, eliminating dependency on third-party messaging platforms.
- **Multi-device subscriptions:** Each user can have multiple push subscriptions (one per browser/device), all stored and sent to in parallel.
- **In-memory subscription store:** MVP uses an in-memory Map for subscription management. Production will migrate to database persistence.
- **Automatic cleanup:** Expired/invalid subscriptions (HTTP 410 Gone) are automatically removed after failed delivery attempts.

## Implementation

### Files Changed

- `packages/api/src/notification/web-push.service.ts` -- WebPushService: subscribe, sendPriceAlert, sendBookingUpdate, multi-device delivery
- `packages/api/src/notification/notification.service.ts` -- BullMQ notification queue and worker (5 concurrent jobs)
- `packages/api/src/notification/notification.module.ts` -- NestJS module
- `packages/web/public/sw.js` -- Push event handler and notification click routing in service worker

### Key Components

- **WebPushService** -- Configures VAPID credentials from environment, manages user subscriptions (Map<userId, PushSubscription[]>), sends typed notifications with localized Russian text and action buttons
- **NotificationService** -- BullMQ queue ("notifications") with 5 job types: PRICE_ALERT_CHECK, BOOKING_CONFIRMATION, FREEZE_EXPIRY_REMINDER, WEEKLY_DIGEST, PRICE_DROP_DETECTED
- **SW push handler** -- Parses push event data, shows notification with type-specific actions: price-alert ("Book"/"Freeze"), booking-update ("View Details"), price-drop ("View Refund")

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/notifications/subscribe` | Bearer | Subscribe browser to Web Push (endpoint + keys) |

## Data Model

- In-memory Map<string, PushSubscription[]> for MVP
- **PushSubscription interface:** endpoint (string), keys.p256dh (string), keys.auth (string)

## Dependencies

- **auth-system** -- User identification for subscription management

## Testing

1. Verify VAPID configuration: set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` env vars
2. Subscribe a browser and verify subscription is stored
3. Send price alert push and verify notification appears with correct Russian text
4. Send booking update push and verify notification routing on click
5. Verify expired subscription cleanup (410 Gone response)
6. Verify multiple device support: subscribe from two browsers, both should receive notification

## Notes

- Environment variables required: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- Without VAPID keys, service logs a warning and push notifications are disabled
- Notification tags prevent duplicate notifications for the same event (e.g., `price-alert-SVO-AER`)
- Vibration pattern: [200ms, 100ms, 200ms]
- BullMQ job retention: 100 completed jobs, 50 failed jobs kept for debugging
- Freeze expiry reminders are scheduled at 3 days and 1 day before expiration using BullMQ delay
