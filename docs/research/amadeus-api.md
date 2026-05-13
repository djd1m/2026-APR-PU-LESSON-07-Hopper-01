# Amadeus Self-Service API — Flight Search Integration

**Дата исследования:** 2026-05-13
**Статус:** Интеграция готова, нужны credentials

---

## Что такое Amadeus

Amadeus — крупнейшая в мире GDS (Global Distribution System). Amadeus Self-Service API предоставляет доступ к:
- Расписаниям 400+ авиакомпаний
- Реальным ценам в реальном времени
- Бронированию и выписке билетов
- Данным об отелях и трансферах

**Источник:** [developers.amadeus.com](https://developers.amadeus.com/self-service)

---

## Pricing

| Tier | Стоимость | Лимиты | Данные |
|------|-----------|--------|--------|
| **Test (Sandbox)** | **Бесплатно** | 10 req/sec | Реальные расписания, тестовые цены |
| Production | Pay-per-use | Без лимита | Реальные расписания + реальные цены |

**Production pricing** (pay-per-use):
- Flight Offers Search: $0.01-0.04 per request
- Flight Create Orders: $1-2 per booking
- No monthly fee

**Источник:** [developers.amadeus.com/pricing](https://developers.amadeus.com/pricing)

---

## Регистрация (бесплатно, 2 минуты)

1. Перейти на [developers.amadeus.com](https://developers.amadeus.com/)
2. Нажать "Register"
3. Подтвердить email
4. Войти → "My Self-Service Workspace" → "Create New App"
5. Получить `API Key` (client_id) и `API Secret` (client_secret)
6. Прописать в `.env`:
   ```
   AMADEUS_CLIENT_ID=ваш_api_key
   AMADEUS_CLIENT_SECRET=ваш_api_secret
   AMADEUS_ENV=test
   ```

---

## API Reference

### Base URLs

| Environment | URL |
|------------|-----|
| Test (Sandbox) | `https://test.api.amadeus.com` |
| Production | `https://api.amadeus.com` |

### Authentication (OAuth2 client_credentials)

```bash
curl -X POST "https://test.api.amadeus.com/v1/security/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id={KEY}&client_secret={SECRET}"
```

**Response:**
```json
{
  "type": "amadeusOAuth2Token",
  "access_token": "ApjU0sEenniHCgPDrndzOSWFk5mN",
  "expires_in": 1799,
  "token_type": "Bearer"
}
```

### Flight Offers Search

**Endpoint:** `GET /v2/shopping/flight-offers`

**Parameters:**
| Param | Required | Example | Description |
|-------|:--------:|---------|-------------|
| originLocationCode | Yes | SVO | IATA origin |
| destinationLocationCode | Yes | AER | IATA destination |
| departureDate | Yes | 2026-07-15 | YYYY-MM-DD |
| adults | Yes | 1 | 1-9 |
| travelClass | No | ECONOMY | ECONOMY/PREMIUM_ECONOMY/BUSINESS/FIRST |
| nonStop | No | false | Direct flights only |
| max | No | 20 | Max results |
| currencyCode | No | RUB | Price currency |

**Example:**
```bash
curl "https://test.api.amadeus.com/v2/shopping/flight-offers?\
originLocationCode=SVO&destinationLocationCode=AER&\
departureDate=2026-07-15&adults=1&travelClass=ECONOMY&max=10" \
  -H "Authorization: Bearer {token}"
```

**Response (abbreviated):**
```json
{
  "data": [
    {
      "id": "1",
      "itineraries": [{
        "duration": "PT2H30M",
        "segments": [{
          "departure": {"iataCode": "SVO", "at": "2026-07-15T06:00:00"},
          "arrival": {"iataCode": "AER", "at": "2026-07-15T08:30:00"},
          "carrierCode": "SU",
          "number": "1132",
          "aircraft": {"code": "73H"},
          "numberOfStops": 0
        }]
      }],
      "price": {
        "currency": "RUB",
        "total": "24194.00",
        "grandTotal": "24194.00"
      },
      "numberOfBookableSeats": 9
    }
  ],
  "dictionaries": {
    "carriers": {"SU": "AEROFLOT"}
  }
}
```

---

## Другие полезные API (бесплатные в sandbox)

| API | Endpoint | Описание |
|-----|----------|----------|
| Flight Offers Price | POST /v1/shopping/flight-offers/pricing | Подтвердить цену перед бронированием |
| Flight Create Orders | POST /v1/booking/flight-orders | Забронировать |
| Flight Order Management | GET/DELETE /v1/booking/flight-orders/{id} | Управление бронью |
| Airport & City Search | GET /v1/reference-data/locations | Автокомплит аэропортов |
| Flight Cheapest Date | GET /v1/shopping/flight-dates | Самые дешёвые даты |

---

## Сравнение: Amadeus vs Travelpayouts vs Nemo.travel

| | Amadeus Self-Service | Travelpayouts Data API | Nemo.travel |
|---|:---:|:---:|:---:|
| Реальные расписания | **Да (400+ airlines)** | Нет (только цены) | Да (через GDS) |
| Бесплатный sandbox | **Да** | Да | Нет |
| Бронирование | Да ($1-2/booking) | Нет (affiliate) | Да ($0.25/ticket) |
| Регистрация | Мгновенная (email) | Мгновенная (email) | Договор (недели) |
| Российские авиалинии | Частично | **Полностью** | **Полностью** |
| Monthly fee | $0 (pay-per-use) | $0 | $500/мес |

---

## Наша архитектура поиска

```
Search Request
     ↓
[1] Amadeus (если AMADEUS_CLIENT_ID задан)
     → 400+ airlines, реальные расписания, до 20 рейсов
     → Если есть результаты → return
     ↓
[2] Travelpayouts (если TRAVELPAYOUTS_TOKEN задан)
     → 1 лучшая цена + estimated рейсы (±30%)
     → Если есть результаты → return
     ↓
[3] Mock (fallback)
     → Сгенерированные рейсы для 5 авиакомпаний
     → Всегда работает
```

---

## Рекомендация

**Для MVP/демо:** Amadeus Sandbox (бесплатно, реальные расписания)
**Для production (РФ):** Nemo.travel (Сирена Трэвел = российские авиалинии, $500/мес)
**Гибрид:** Amadeus (международные) + Nemo.travel (внутренние РФ)
