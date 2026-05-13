# Feature: Telegram Bot (Search + Booking)

**ID:** telegram-bot
**Priority:** v1.0
**Epic:** E4
**Status:** Done
**Branch:** N/A
**Stories:** US-13, US-14, US-15

## Overview

Telegram bot built with Telegraf.js that provides natural language flight search, inline booking flow with protection selection, price alert management, and booking history viewing. Supports both explicit commands and natural language queries (e.g., "Moskva Sochi iyul"). Optional channel for VPN users since Telegram was blocked in Russia in April 2026.

## Architecture Decision

- **Telegraf.js framework:** Lightweight, TypeScript-native Telegram bot framework with session middleware and inline keyboard support.
- **Internal API client:** Bot communicates with the HopperRU API via Axios HTTP client, not directly with the database. This ensures all business logic is centralized in the API.
- **Natural language parsing:** Custom parser handles Russian city names, IATA codes, date formats (DD.MM, month names in Russian), and mixed inputs.
- **Rate limiting:** 1 message per second per user to prevent abuse, implemented as middleware.

## Implementation

### Files Changed

- `packages/bot/src/bot.ts` -- Bot factory: creates Telegraf instance, registers middleware (session, rate limit), commands, and callback handler
- `packages/bot/src/main.ts` -- Entry point: loads env, creates bot, starts polling
- `packages/bot/src/commands/start.ts` -- `/start` command: welcome message, auto-registration via API
- `packages/bot/src/commands/search.ts` -- `/search` command + natural language text handler with Russian month/date parsing
- `packages/bot/src/commands/bookings.ts` -- `/bookings` command: list user bookings with status emoji and protection details
- `packages/bot/src/commands/alerts.ts` -- `/alerts` command: list active alerts with delete buttons
- `packages/bot/src/handlers/callback.ts` -- Inline button handler: flight selection, protection add, booking confirmation, price freeze, prediction view, alert deletion
- `packages/bot/src/services/api-client.ts` -- Axios client for internal API communication
- `packages/bot/src/utils/formatters.ts` -- Price/date/flight formatting utilities

### Key Components

- **createBot()** -- Configures Telegraf with session (in-memory), rate limiting (1 msg/sec), command handlers, callback handler, and global error handler
- **parseSearchQuery()** -- Parses "Moskva Sochi iyul" into {origin, destination, date} with Russian month name dictionary and DD.MM date format support
- **registerCallbackHandler()** -- Handles 7 callback patterns: select_flight, add_protection, confirm_booking, freeze, predict, delete_alert, cancel_booking
- **apiClient** -- Axios instance with base URL from `API_BASE_URL` env var, 10-second timeout, optional internal API key header

## API Endpoints

Bot consumes the following HopperRU API endpoints:

| API Endpoint | Bot Usage |
|-------------|-----------|
| POST `/users/register` | Auto-register on /start |
| GET `/flights/search` | Flight search |
| GET `/flights/:id` | Flight details for booking |
| POST `/bookings` | Create booking |
| GET `/bookings` | List user bookings |
| GET `/alerts` | List user alerts |
| DELETE `/alerts/:id` | Delete alert |
| POST `/freeze` | Create price freeze |
| GET `/predict/:id` | Get price prediction |

## Data Model

- Bot has no local data model; all data flows through the API
- Session state (in-memory): searchState { origin, destination, date }

## Dependencies

- **search-flights** -- Flight search data
- **booking-engine** -- Booking creation and listing

## Testing

1. `/start` -- should display welcome message with command list
2. Send "Moskva Sochi iyul" -- should trigger search and show top 5 results with inline buttons
3. `/search SVO AER 15.07` -- should search and display results
4. Click "Select {price}" button -- should show protection selection screen
5. Click "Confirm Booking" -- should create booking via API
6. `/bookings` -- should list bookings with status emoji and protection info
7. `/alerts` -- should list alerts with delete buttons
8. Click "Price Prediction" button -- should show BUY_NOW/WAIT recommendation

## Notes

- Telegram was blocked in Russia in April 2026; bot is optional for VPN users
- Rate limit: 1 message per second per user (silent drop on excess)
- Russian month names supported: full forms, genitive case, and 3-letter abbreviations
- Session is in-memory and stateless across bot restarts
- Error handler sends generic "An error occurred" message to user and logs full error
- API base URL configurable via `API_BASE_URL` env var (default: `http://localhost:3000/api/v1`)
