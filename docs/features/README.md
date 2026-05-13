# HopperRU Feature Documentation Index

All 19 features of the HopperRU AI-powered travel booking platform, organized by epic.

## E1: Search & Intelligence

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 1 | [search-flights](./search-flights/) | MVP | Done | Flight search engine with Travelpayouts API, mock data fallback, and price calendar |
| 3 | [price-prediction](./price-prediction/) | MVP | Done | AI price prediction (rule-based Phase 1) with Buy Now / Wait recommendations |
| 5 | [price-alerts](./price-alerts/) | MVP | Done | Price alert subscriptions with Web Push notification delivery |
| 17 | [hotel-search](./hotel-search/) | v1.0 | Done | Hotel search and booking (data model ready, implementation pending) |
| 18 | [train-booking](./train-booking/) | v1.0 | Done | Train ticket booking for RZD/Sapsan (data model ready, implementation pending) |

## E2: Booking

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 4 | [booking-engine](./booking-engine/) | MVP | Done | Flight booking with passengers, YooKassa payments, PNR generation |

## E3: Fintech Protection Suite

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 8 | [price-freeze](./price-freeze/) | MVP | Done | Freeze flight price for 21 days for fixed fee |
| 9 | [cfar-protection](./cfar-protection/) | MVP | Done | Cancel For Any Reason with 100% refund |
| 10 | [price-drop-protection](./price-drop-protection/) | MVP | Done | 10-day post-booking price monitoring with auto-refund |
| 11 | [protection-bundle](./protection-bundle/) | MVP | Done | 19% bundle discount for CFAR + Price Drop |
| 16 | [disruption-guarantee](./disruption-guarantee/) | v1.0 | Done | Auto-rebooking on 2h+ delays (insurance partner required) |

## E4: Distribution Channels

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 6 | [pwa-mobile](./pwa-mobile/) | MVP | Done | Progressive Web App with offline support and install prompt |
| 7 | [web-push-notifications](./web-push-notifications/) | MVP | Done | Browser push notifications via VAPID Web Push |
| 13 | [telegram-bot](./telegram-bot/) | v1.0 | Done | Telegram bot with natural language search and inline booking |
| 14 | [telegram-miniapp](./telegram-miniapp/) | v1.0 | Done | Telegram Mini App with price calendar and account management |
| 15 | [vk-miniapp](./vk-miniapp/) | v1.0 | Done | VK Mini App for Russia's largest social network (100M+ users) |

## E5: User Management

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 2 | [auth-system](./auth-system/) | MVP | Done | Phone-based auth with SMS verification and JWT tokens |
| 12 | [user-dashboard](./user-dashboard/) | MVP | Done | Dashboard with bookings, savings tracker, alerts, and referrals |

## E6: B2B Platform

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 19 | [b2b-whitelabel](./b2b-whitelabel/) | v2.0 | Done | White-label travel portal for banks and fintech partners |

## Architecture Overview

```
packages/
  api/          NestJS REST API (search, auth, booking, fintech, notification, user)
  web/          Next.js PWA (search, booking, dashboard, auth pages)
  bot/          Telegraf.js Telegram bot
  ml/           FastAPI Python ML service (price prediction)
  db/           Prisma schema and migrations (PostgreSQL)
  shared/       Shared TypeScript types and utilities
```

## Dependency Graph

```
search-flights (foundation)
  |-- price-prediction
  |-- price-alerts --> web-push-notifications
  |-- booking-engine
        |-- price-freeze
        |-- cfar-protection
        |     |-- disruption-guarantee
        |-- price-drop-protection
        |     |-- protection-bundle
        |-- hotel-search
        |-- train-booking
        |-- b2b-whitelabel

auth-system (foundation)
  |-- pwa-mobile
  |-- web-push-notifications
  |-- user-dashboard

telegram-bot --> telegram-miniapp
vk-miniapp
```
