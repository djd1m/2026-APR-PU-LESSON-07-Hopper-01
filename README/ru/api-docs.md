# HopperRU -- Документация API

## Содержание

1. [Общая информация](#общая-информация)
2. [Аутентификация](#аутентификация)
3. [Endpoints](#endpoints)
4. [Коды ошибок](#коды-ошибок)
5. [Rate Limiting](#rate-limiting)
6. [Webhooks](#webhooks)

---

## Общая информация

### Базовый URL

```
Production: https://api.hopperru.ru/api
Staging:    https://staging-api.hopperru.ru/api
Local:      http://localhost:7101/api
```

### Формат данных

- Все запросы и ответы в формате **JSON**
- Кодировка: **UTF-8**
- Даты в формате **ISO 8601** (`2026-07-15T10:30:00Z`)
- Денежные суммы в **копейках** (целое число)
- Content-Type: `application/json`

### Swagger

Интерактивная документация доступна по адресу:

```
http://localhost:7101/api/docs
```

---

## Аутентификация

HopperRU использует JWT-токены для аутентификации. Первичная авторизация -- через email/телефон (Web-приложение) или Telegram OAuth (для VPN-пользователей).

> **Примечание:** С апреля 2026 Telegram заблокирован в РФ (ADR-6). Web-приложение + PWA является основным интерфейсом. Авторизация через email/SMS (SMSC.ru) рекомендуется как основной способ.

### Шаг 1. Авторизация через Telegram

```
POST /api/auth/telegram
```

**Тело запроса:**

```json
{
  "id": 123456789,
  "first_name": "Иван",
  "last_name": "Петров",
  "username": "ivanpetrov",
  "photo_url": "https://t.me/i/userpic/320/ivpetrov.jpg",
  "auth_date": 1715500000,
  "hash": "a1b2c3d4e5f6..."
}
```

Параметры передаются из Telegram Login Widget. Поле `hash` верифицируется на сервере по `TELEGRAM_BOT_TOKEN`.

**Ответ (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "usr_abc123",
    "telegramId": 123456789,
    "firstName": "Иван",
    "lastName": "Петров",
    "username": "ivanpetrov",
    "createdAt": "2026-05-01T12:00:00Z"
  }
}
```

### Шаг 2. Использование Access Token

Передавайте токен в заголовке `Authorization`:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Шаг 3. Обновление токена

```
POST /api/auth/refresh
```

**Тело запроса:**

```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Ответ (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...(new)",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...(new)",
  "expiresIn": 900
}
```

### Время жизни токенов

| Токен | TTL | Примечание |
|-------|-----|------------|
| Access Token | 15 минут | Для каждого запроса к API |
| Refresh Token | 7 дней | Для получения нового Access Token |

---

## Endpoints

### Поиск рейсов

```
GET /api/search/flights
```

Поиск доступных рейсов по маршруту и дате.

**Query-параметры:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| `origin` | string | Да | Код аэропорта вылета (IATA), напр. `SVO` |
| `destination` | string | Да | Код аэропорта прилета (IATA), напр. `AER` |
| `departureDate` | string | Да | Дата вылета (YYYY-MM-DD) |
| `returnDate` | string | Нет | Дата возврата (YYYY-MM-DD), для RT |
| `passengers` | integer | Нет | Количество пассажиров (по умолчанию 1, макс. 9) |
| `cabinClass` | string | Нет | `economy` (по умолчанию) или `business` |
| `flexibleDates` | boolean | Нет | Поиск +/- 3 дня от указанной даты |

**Пример запроса:**

```bash
curl -X GET "https://api.hopperru.ru/api/search/flights?\
origin=SVO&destination=AER&departureDate=2026-07-15&passengers=2" \
  -H "Authorization: Bearer <token>"
```

**Ответ (200 OK):**

```json
{
  "flights": [
    {
      "id": "flt_abc123",
      "airline": "Аэрофлот",
      "airlineCode": "SU",
      "flightNumber": "SU1120",
      "origin": {
        "code": "SVO",
        "name": "Шереметьево",
        "city": "Москва"
      },
      "destination": {
        "code": "AER",
        "name": "Адлер",
        "city": "Сочи"
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

> **Примечание:** `price.amount` указан в копейках. 750000 = 7 500,00 руб.

---

### Предсказание цены

```
GET /api/predict
```

Получение AI-предсказания для конкретного маршрута.

**Query-параметры:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| `origin` | string | Да | Код аэропорта вылета (IATA) |
| `destination` | string | Да | Код аэропорта прилета (IATA) |
| `departureDate` | string | Да | Дата вылета (YYYY-MM-DD) |

**Пример запроса:**

```bash
curl -X GET "https://api.hopperru.ru/api/predict?\
origin=SVO&destination=AER&departureDate=2026-07-15" \
  -H "Authorization: Bearer <token>"
```

**Ответ (200 OK):**

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
      "Высокий сезон: цены стабильно растут за 5 дней до вылета",
      "Заполняемость рейса 78%: ограниченное количество дешевых мест"
    ]
  },
  "historicalPrices": {
    "min30d": 680000,
    "max30d": 950000,
    "avg30d": 780000
  }
}
```

| Значение `recommendation` | Описание |
|---------------------------|----------|
| `buy` | Покупайте сейчас (зеленый бейдж) |
| `wait` | Подождите (желтый бейдж) |
| `insufficient_data` | Недостаточно данных (серый бейдж) |

---

### Бронирование

```
POST /api/book
```

Создание бронирования и инициация оплаты.

**Тело запроса:**

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

**Параметры passengers:**

| Поле | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `firstName` | string | Да | Имя (латиницей, как в документе) |
| `lastName` | string | Да | Фамилия |
| `middleName` | string | Нет | Отчество |
| `birthDate` | string | Да | Дата рождения (YYYY-MM-DD) |
| `documentType` | string | Да | `passport_ru`, `passport_intl`, `birth_cert` |
| `documentNumber` | string | Да | Номер документа |
| `gender` | string | Да | `male` или `female` |

**Параметры protection:**

| Поле | Тип | Описание |
|------|-----|----------|
| `cfar` | boolean | Включить защиту "Отмена по любой причине" |
| `priceDropProtection` | boolean | Включить защиту от снижения цены |

**Параметры paymentMethod:**

| Значение | Описание |
|----------|----------|
| `mir` | Оплата картой МИР |
| `sbp` | Система быстрых платежей |
| `qr` | QR-код для оплаты |

**Ответ (201 Created):**

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

> **Важно:** Бронирование действительно 30 минут (`expiresAt`). Если оплата не поступит, бронирование аннулируется.

---

### Заморозка цены

```
POST /api/freeze
```

Заморозить текущую цену на рейс.

**Тело запроса:**

```json
{
  "flightId": "flt_abc123",
  "durationDays": 14,
  "paymentMethod": "mir"
}
```

| Поле | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `flightId` | string | Да | ID рейса из результатов поиска |
| `durationDays` | integer | Да | Срок заморозки: 7, 14 или 21 день |
| `paymentMethod` | string | Да | `mir`, `sbp`, `qr` |

**Ответ (201 Created):**

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

> **Примечание:** `fee` -- стоимость заморозки в копейках. 250000 = 2 500,00 руб.

---

### Финансовая защита

```
POST /api/protect
```

Добавить финансовую защиту к существующему бронированию.

**Тело запроса:**

```json
{
  "bookingId": "bkng_def456",
  "protectionType": "cfar",
  "paymentMethod": "sbp"
}
```

| Поле | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `bookingId` | string | Да | ID бронирования |
| `protectionType` | string | Да | `cfar` или `price_drop` |
| `paymentMethod` | string | Да | `mir`, `sbp`, `qr` |

**Ответ (201 Created):**

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

Для `price_drop` поле `coverage` будет содержать:

```json
{
  "refundPercent": 100,
  "cancellationDeadline": null,
  "monitoringPeriodDays": 10
}
```

---

## Коды ошибок

Все ошибки возвращаются в едином формате:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Описание ошибки для разработчика",
    "details": [
      {
        "field": "departureDate",
        "message": "Дата вылета не может быть в прошлом"
      }
    ]
  }
}
```

### HTTP-коды

| Код | Значение | Когда возникает |
|-----|----------|-----------------|
| 400 | Bad Request | Некорректный формат запроса, отсутствуют обязательные поля |
| 401 | Unauthorized | Токен отсутствует, истек или невалиден |
| 403 | Forbidden | Нет прав на данное действие (чужое бронирование) |
| 404 | Not Found | Ресурс не найден (рейс, бронирование, заморозка) |
| 422 | Unprocessable Entity | Валидация бизнес-правил (рейс распродан, срок заморозки истек) |
| 429 | Too Many Requests | Превышен лимит запросов (rate limiting) |
| 500 | Internal Server Error | Внутренняя ошибка сервера |

### Бизнес-коды ошибок

| Код | HTTP | Описание |
|-----|------|----------|
| `FLIGHT_NOT_FOUND` | 404 | Рейс не найден или более недоступен |
| `FLIGHT_SOLD_OUT` | 422 | Рейс полностью распродан |
| `FREEZE_EXPIRED` | 422 | Срок заморозки цены истек |
| `FREEZE_LIMIT_REACHED` | 422 | Максимум активных заморозок |
| `BOOKING_EXPIRED` | 422 | Бронирование истекло (не оплачено за 30 мин) |
| `PAYMENT_FAILED` | 422 | Ошибка платежа (отказ банка, недостаточно средств) |
| `PROTECTION_NOT_AVAILABLE` | 422 | Защита недоступна для данного рейса |
| `CANCELLATION_DEADLINE_PASSED` | 422 | Срок отмены CFAR истек (< 24ч до вылета) |
| `ALERT_LIMIT_REACHED` | 422 | Максимум 10 активных алертов |
| `INVALID_TELEGRAM_AUTH` | 401 | Невалидная подпись Telegram OAuth |
| `TOKEN_EXPIRED` | 401 | Access Token истек, используйте refresh |
| `RATE_LIMIT_EXCEEDED` | 429 | Превышен лимит запросов |

---

## Rate Limiting

| Параметр | Значение |
|----------|----------|
| Лимит | 100 запросов в минуту на пользователя |
| Идентификация | По Access Token (авторизованные) или IP (неавторизованные) |
| Заголовки ответа | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |

### Заголовки Rate Limit

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1715500060
```

| Заголовок | Описание |
|-----------|----------|
| `X-RateLimit-Limit` | Максимум запросов в окне |
| `X-RateLimit-Remaining` | Оставшиеся запросы в текущем окне |
| `X-RateLimit-Reset` | Unix timestamp сброса счетчика |

При превышении лимита возвращается:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Превышен лимит запросов. Повторите через 23 секунды.",
    "retryAfter": 23
  }
}
```

---

## Webhooks

### YooKassa Payment Notifications

HopperRU принимает webhook-уведомления от YooKassa о статусе платежей.

**URL webhook:** `POST /api/webhooks/yookassa`

**Верификация:** Каждый запрос верифицируется по подписи в заголовке, сверяемой с `YOOKASSA_WEBHOOK_SECRET`.

### Формат уведомления

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

### Поддерживаемые события

| Событие | Описание | Действие HopperRU |
|---------|----------|--------------------|
| `payment.succeeded` | Платеж успешен | Подтверждение бронирования / заморозки / защиты |
| `payment.canceled` | Платеж отменен | Аннулирование бронирования |
| `payment.waiting_for_capture` | Ожидает подтверждения | Capture или отмена |
| `refund.succeeded` | Возврат выполнен | Обновление статуса возврата |

### Идемпотентность

Webhook может быть доставлен повторно. HopperRU обрабатывает уведомления идемпотентно -- повторная обработка того же `payment.id` не создает дублей.

### Retry-политика YooKassa

YooKassa повторяет доставку webhook до получения HTTP 200:

| Попытка | Задержка |
|---------|----------|
| 1 | Немедленно |
| 2 | 1 минута |
| 3 | 5 минут |
| 4 | 30 минут |
| 5 | 1 час |
| 6+ | Каждые 3 часа (до 3 дней) |

Возвращайте HTTP 200 для подтверждения получения, даже если обработка будет выполнена асинхронно.
