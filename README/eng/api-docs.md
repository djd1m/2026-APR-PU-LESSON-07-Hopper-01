# HopperRU -- API Documentation

## Contents

1. [General Information](#general-information)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Error Codes](#error-codes)
5. [Rate Limiting](#rate-limiting)
6. [Webhooks](#webhooks)

---

## General Information

### Base URL

```
Production: https://api.hopperru.ru/api
Staging:    https://staging-api.hopperru.ru/api
Local:      http://localhost:7101/api
```

### Data Format

- All requests and responses are in **JSON** format
- Encoding: **UTF-8**
- Dates in **ISO 8601** format (`2026-07-15T10:30:00Z`)
- Monetary amounts in **kopecks** (integer). 100 kopecks = 1 RUB
- Content-Type: `application/json`

### Swagger

Interactive documentation is available at:

```
http://localhost:7101/api/docs
```

---

## Authentication

HopperRU uses JWT tokens for authentication. Primary authorization is via email/phone (Web application) or Telegram OAuth (for VPN users).

> **Note:** Since April 2026, Telegram is blocked in Russia (ADR-6). The Web application + PWA is the primary interface. Authorization via email/SMS (SMSC.ru) is recommended as the main method.

### Step 1. Authorize via Telegram

```
POST /api/auth/telegram
```

**Request body:**

```json
{
  "id": 123456789,
  "first_name": "Ivan",
  "last_name": "Petrov",
  "username": "ivanpetrov",
  "photo_url": "https://t.me/i/userpic/320/ivpetrov.jpg",
  "auth_date": 1715500000,
  "hash": "a1b2c3d4e5f6..."
}
```

Parameters are provided by the Telegram Login Widget. The `hash` field is verified on the server using the `TELEGRAM_BOT_TOKEN`.

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "usr_abc123",
    "telegramId": 123456789,
    "firstName": "Ivan",
    "lastName": "Petrov",
    "username": "ivanpetrov",
    "createdAt": "2026-05-01T12:00:00Z"
  }
}
```

### Step 2. Use the Access Token

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Step 3. Refresh the Token

```
POST /api/auth/refresh
```

**Request body:**

```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...(new)",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...(new)",
  "expiresIn": 900
}
```

### Token Lifetimes

| Token | TTL | Note |
|-------|-----|------|
| Access Token | 15 minutes | Required for every API request |
| Refresh Token | 7 days | Used to obtain a new Access Token |

---

## Endpoints

### Flight Search

```
GET /api/search/flights
```

Search for available flights by route and date.

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `origin` | string | Yes | Departure airport code (IATA), e.g. `SVO` |
| `destination` | string | Yes | Arrival airport code (IATA), e.g. `AER` |
| `departureDate` | string | Yes | Departure date (YYYY-MM-DD) |
| `returnDate` | string | No | Return date (YYYY-MM-DD), for round trips |
| `passengers` | integer | No | Number of passengers (default 1, max 9) |
| `cabinClass` | string | No | `economy` (default) or `business` |
| `flexibleDates` | boolean | No | Search +/- 3 days from the specified date |

**Example request:**

```bash
curl -X GET "https://api.hopperru.ru/api/search/flights?\
origin=SVO&destination=AER&departureDate=2026-07-15&passengers=2" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "flights": [
    {
      "id": "flt_abc123",
      "airline": "Aeroflot",
      "airlineCode": "SU",
      "flightNumber": "SU1120",
      "origin": {
        "code": "SVO",
        "name": "Sheremetyevo",
        "city": "Moscow"
      },
      "destination": {
        "code": "AER",
        "name": "Adler",
        "city": "Sochi"
      },
      "departureTime": "2026-07-15T08:30:00+03:00",
      "arrivalTime": "2026-07-15T11:10:00+03:00",
      "duration": 160,
      "price": {
        "amount": 750000,
        "currency": "RUB",
        "perPassenger": 375000
      },
      "seatsAvailable": 23,
      "cabinClass": "economy",
      "prediction": {
        "recommendation": "buy",
        "confidence": 0.85,
        "priceDirection": "up",
        "expectedChange": 12
      }
    }
  ],
  "meta": {
    "totalResults": 15,
    "searchId": "srch_xyz789",
    "cachedUntil": "2026-07-14T12:30:00Z"
  }
}
```

> **Note:** `price.amount` is in kopecks. 750000 = 7,500.00 RUB.

---

### Price Prediction

```
GET /api/predict
```

Get an AI prediction for a specific route.

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `origin` | string | Yes | Departure airport code (IATA) |
| `destination` | string | Yes | Arrival airport code (IATA) |
| `departureDate` | string | Yes | Departure date (YYYY-MM-DD) |

**Example request:**

```bash
curl -X GET "https://api.hopperru.ru/api/predict?\
origin=SVO&destination=AER&departureDate=2026-07-15" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "prediction": {
    "recommendation": "buy",
    "confidence": 0.85,
    "currentPrice": 750000,
    "predictedMinPrice": 720000,
    "predictedMaxPrice": 890000,
    "priceDirection": "up",
    "expectedChangePercent": 12,
    "optimalBuyDate": "2026-07-10",
    "factors": [
      "High season: prices consistently rise within 5 days of departure",
      "Flight occupancy at 78%: limited availability of cheap seats"
    ]
  },
  "historicalPrices": {
    "min30d": 680000,
    "max30d": 950000,
    "avg30d": 780000
  }
}
```

| `recommendation` Value | Description |
|------------------------|-------------|
| `buy` | Buy now (green badge) |
| `wait` | Wait (yellow badge) |
| `insufficient_data` | Insufficient data (gray badge) |

---

### Booking

```
POST /api/book
```

Create a booking and initiate payment.

**Request body:**

```json
{
  "flightId": "flt_abc123",
  "passengers": [
    {
      "firstName": "IVAN",
      "lastName": "PETROV",
      "middleName": "SERGEEVICH",
      "birthDate": "1990-05-20",
      "documentType": "passport_ru",
      "documentNumber": "4515123456",
      "gender": "male"
    }
  ],
  "contactEmail": "ivan@example.com",
  "contactPhone": "+79161234567",
  "paymentMethod": "sbp",
  "protection": {
    "cfar": true,
    "priceDropProtection": true
  }
}
```

**Passenger parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | First name (as in document) |
| `lastName` | string | Yes | Last name |
| `middleName` | string | No | Middle name / patronymic |
| `birthDate` | string | Yes | Date of birth (YYYY-MM-DD) |
| `documentType` | string | Yes | `passport_ru`, `passport_intl`, `birth_cert` |
| `documentNumber` | string | Yes | Document number |
| `gender` | string | Yes | `male` or `female` |

**Protection parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `cfar` | boolean | Enable Cancel For Any Reason protection |
| `priceDropProtection` | boolean | Enable Price Drop Protection |

**Payment method values:**

| Value | Description |
|-------|-------------|
| `mir` | MIR card payment |
| `sbp` | Fast Payment System |
| `qr` | QR code payment |

**Response (201 Created):**

```json
{
  "booking": {
    "id": "bkng_def456",
    "status": "pending_payment",
    "flightId": "flt_abc123",
    "totalPrice": 862500,
    "breakdown": {
      "flightPrice": 750000,
      "cfarPrice": 75000,
      "priceDropProtectionPrice": 37500
    },
    "passengers": 1,
    "createdAt": "2026-07-10T14:00:00Z",
    "expiresAt": "2026-07-10T14:30:00Z"
  },
  "payment": {
    "id": "pmt_ghi789",
    "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
    "method": "sbp",
    "amount": 862500,
    "currency": "RUB"
  }
}
```

> **Important:** The booking is valid for 30 minutes (`expiresAt`). If payment is not received, the booking is automatically canceled.

---

### Price Freeze

```
POST /api/freeze
```

Freeze the current price of a flight.

**Request body:**

```json
{
  "flightId": "flt_abc123",
  "durationDays": 14,
  "paymentMethod": "mir"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `flightId` | string | Yes | Flight ID from search results |
| `durationDays` | integer | Yes | Freeze duration: 7, 14, or 21 days |
| `paymentMethod` | string | Yes | `mir`, `sbp`, `qr` |

**Response (201 Created):**

```json
{
  "freeze": {
    "id": "frz_jkl012",
    "flightId": "flt_abc123",
    "frozenPrice": 750000,
    "currentPrice": 750000,
    "fee": 250000,
    "durationDays": 14,
    "status": "active",
    "expiresAt": "2026-07-24T14:00:00Z",
    "createdAt": "2026-07-10T14:00:00Z"
  },
  "payment": {
    "id": "pmt_mno345",
    "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
    "method": "mir",
    "amount": 250000,
    "currency": "RUB"
  }
}
```

> **Note:** `fee` is the freeze cost in kopecks. 250000 = 2,500.00 RUB.

---

### Financial Protection

```
POST /api/protect
```

Add financial protection to an existing booking.

**Request body:**

```json
{
  "bookingId": "bkng_def456",
  "protectionType": "cfar",
  "paymentMethod": "sbp"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookingId` | string | Yes | Booking ID |
| `protectionType` | string | Yes | `cfar` or `price_drop` |
| `paymentMethod` | string | Yes | `mir`, `sbp`, `qr` |

**Response (201 Created):**

```json
{
  "protection": {
    "id": "prt_pqr678",
    "bookingId": "bkng_def456",
    "type": "cfar",
    "status": "active",
    "price": 75000,
    "coverage": {
      "refundPercent": 100,
      "cancellationDeadline": "2026-07-14T08:30:00+03:00",
      "monitoringPeriodDays": null
    },
    "createdAt": "2026-07-10T15:00:00Z"
  },
  "payment": {
    "id": "pmt_stu901",
    "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
    "method": "sbp",
    "amount": 75000,
    "currency": "RUB"
  }
}
```

For `price_drop`, the `coverage` field will contain:

```json
{
  "refundPercent": 100,
  "cancellationDeadline": null,
  "monitoringPeriodDays": 10
}
```

---

## Error Codes

All errors are returned in a unified format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error description for developers",
    "details": [
      {
        "field": "departureDate",
        "message": "Departure date cannot be in the past"
      }
    ]
  }
}
```

### HTTP Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 400 | Bad Request | Malformed request, missing required fields |
| 401 | Unauthorized | Token is missing, expired, or invalid |
| 403 | Forbidden | No permission for this action (another user's booking) |
| 404 | Not Found | Resource not found (flight, booking, freeze) |
| 422 | Unprocessable Entity | Business rule validation (flight sold out, freeze expired) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Internal server error |

### Business Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `FLIGHT_NOT_FOUND` | 404 | Flight not found or no longer available |
| `FLIGHT_SOLD_OUT` | 422 | Flight is completely sold out |
| `FREEZE_EXPIRED` | 422 | Price freeze has expired |
| `FREEZE_LIMIT_REACHED` | 422 | Maximum active freezes reached |
| `BOOKING_EXPIRED` | 422 | Booking expired (not paid within 30 min) |
| `PAYMENT_FAILED` | 422 | Payment error (bank decline, insufficient funds) |
| `PROTECTION_NOT_AVAILABLE` | 422 | Protection unavailable for this flight |
| `CANCELLATION_DEADLINE_PASSED` | 422 | CFAR cancellation deadline passed (< 24h before departure) |
| `ALERT_LIMIT_REACHED` | 422 | Maximum 10 active alerts |
| `INVALID_TELEGRAM_AUTH` | 401 | Invalid Telegram OAuth signature |
| `TOKEN_EXPIRED` | 401 | Access Token expired, use refresh |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |

---

## Rate Limiting

| Parameter | Value |
|-----------|-------|
| Limit | 100 requests per minute per user |
| Identification | By Access Token (authenticated) or IP (unauthenticated) |
| Response headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1715500060
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in the window |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the counter resets |

When the limit is exceeded:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry in 23 seconds.",
    "retryAfter": 23
  }
}
```

---

## Webhooks

### YooKassa Payment Notifications

HopperRU receives webhook notifications from YooKassa about payment status.

**Webhook URL:** `POST /api/webhooks/yookassa`

**Verification:** Each request is verified via a signature in the header, matched against `YOOKASSA_WEBHOOK_SECRET`.

### Notification Format

```json
{
  "type": "notification",
  "event": "payment.succeeded",
  "object": {
    "id": "2a34f5c7-000f-5000-a000-1d267e4400d2",
    "status": "succeeded",
    "amount": {
      "value": "7500.00",
      "currency": "RUB"
    },
    "payment_method": {
      "type": "sbp"
    },
    "metadata": {
      "bookingId": "bkng_def456",
      "type": "booking"
    },
    "created_at": "2026-07-10T14:05:00.000+03:00"
  }
}
```

### Supported Events

| Event | Description | HopperRU Action |
|-------|-------------|-----------------|
| `payment.succeeded` | Payment successful | Confirm booking / freeze / protection |
| `payment.canceled` | Payment canceled | Cancel booking |
| `payment.waiting_for_capture` | Awaiting capture | Capture or cancel |
| `refund.succeeded` | Refund completed | Update refund status |

### Idempotency

Webhooks may be delivered more than once. HopperRU processes notifications idempotently -- reprocessing the same `payment.id` does not create duplicates.

### YooKassa Retry Policy

YooKassa retries webhook delivery until it receives HTTP 200:

| Attempt | Delay |
|---------|-------|
| 1 | Immediately |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 1 hour |
| 6+ | Every 3 hours (up to 3 days) |

Return HTTP 200 to acknowledge receipt, even if processing will be done asynchronously.
