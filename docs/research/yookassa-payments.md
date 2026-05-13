# YooKassa Payment Integration Research

**Дата:** 2026-05-13 | **Статус:** Интеграция готова, нужен тестовый магазин

---

## Что такое YooKassa

YooKassa (ЮKassa, ранее Яндекс.Касса) — крупнейший платёжный агрегатор России. Поддерживает все актуальные способы оплаты: MIR, SBP (QR), банковские карты, электронные кошельки.

**Источник:** [yookassa.ru/developers](https://yookassa.ru/developers)

---

## API Reference

### Base URL
```
https://api.yookassa.ru/v3
```

### Аутентификация
HTTP Basic Auth: `shopId:secretKey`
```bash
curl -u <shopId>:<secretKey> https://api.yookassa.ru/v3/payments
```

### Создание платежа
```bash
POST /v3/payments
Headers:
  Authorization: Basic <base64(shopId:secretKey)>
  Idempotence-Key: <UUID>   # обязательно!
  Content-Type: application/json

Body:
{
  "amount": { "value": "24194.00", "currency": "RUB" },
  "capture": true,
  "confirmation": {
    "type": "redirect",
    "return_url": "https://hopperru.com/bookings"
  },
  "description": "Бронирование SU-1132 SVO→AER",
  "metadata": { "booking_id": "ccdc6bb9-..." }
}
```

### Ответ
```json
{
  "id": "2d9f3b4e-000f-5000-a000-1234567890ab",
  "status": "pending",
  "paid": false,
  "amount": { "value": "24194.00", "currency": "RUB" },
  "confirmation": {
    "type": "redirect",
    "confirmation_url": "https://yoomoney.ru/checkout/payments/.../contract"
  },
  "test": true,
  "metadata": { "booking_id": "ccdc6bb9-..." }
}
```

### Payment Flow
```
1. Наш API → POST /v3/payments → YooKassa
2. YooKassa → { confirmation_url } → Наш API
3. Наш API → redirect пользователя на confirmation_url
4. Пользователь оплачивает (MIR/SBP/карта)
5. YooKassa → POST webhook → Наш API /api/payments/webhook
6. Наш API → обновляет статус бронирования
```

---

## Тестовый режим

### Регистрация тестового магазина
1. Перейти: [yookassa.ru/joinups?createTestShop=true](https://yookassa.ru/joinups?createTestShop=true)
2. Зарегистрироваться (email + телефон)
3. Выбрать "Тестирование" вместо продолжения регистрации
4. В личном кабинете → создать тестовый магазин
5. Получить `shopId` и `secretKey`

### Тестовые карты

| Карта | Номер | Результат |
|-------|-------|-----------|
| Visa (success) | `4111 1111 1111 1111` | Успешная оплата |
| MC (success) | `5555 5555 5555 4444` | Успешная оплата |
| MIR (3DS) | `2200 0000 0000 0004` | С подтверждением 3D Secure |
| MC (insufficient) | `5555 5555 5555 4642` | Отказ: недостаточно средств |
| MC (expired) | `5555 5555 5555 4543` | Отказ: карта просрочена |
| MC (invalid CVC) | `5555 5555 5555 4626` | Отказ: неверный CVC |

CVV: любые 3 цифры. Срок: любой будущий.

**Источник:** [yookassa.ru/developers/payment-acceptance/testing](https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing)

---

## Стоимость

| Способ оплаты | Комиссия |
|---------------|---------|
| Банковские карты (MIR/Visa/MC) | 2.8% + НДС |
| SBP (QR-код) | 0.4-0.7% |
| YooMoney кошелёк | 3% |
| Мобильный платёж | 7% |

С 01.01.2026: НДС 22% начисляется на комиссию (не на платёж).

**Источник:** [yookassa.ru/developers](https://yookassa.ru/developers)

---

## Наша архитектура

```
YooKassaService (packages/api/src/payment/yookassa.service.ts)
├── createPayment(amount, currency, description, metadata) → { id, confirmation_url }
├── getPayment(id) → { status, paid, amount }
├── createRefund(paymentId, amount, currency, description) → { id, status }
└── Mock mode: если YOOKASSA_SHOP_ID не задан → симуляция (status=succeeded)

PaymentController (packages/api/src/payment/payment.controller.ts)
├── POST /api/payments/webhook — YooKassa callback (payment.succeeded, payment.canceled)
└── GET  /api/payments/:id — проверка статуса

PaymentModule — глобальный, экспортирует YooKassaService
```

### Env vars
```bash
YOOKASSA_SHOP_ID=     # Shop ID из личного кабинета
YOOKASSA_SECRET=      # Secret Key из Integration → API keys
YOOKASSA_RETURN_URL=  # URL возврата после оплаты (default: /bookings)
```

---

## Активация

```bash
# 1. Зарегистрировать тестовый магазин (бесплатно)
# https://yookassa.ru/joinups?createTestShop=true

# 2. Добавить в .env
YOOKASSA_SHOP_ID=12345
YOOKASSA_SECRET=test_secret_key_from_dashboard

# 3. Перезапустить API
# 4. При бронировании пользователь будет перенаправлен на YooKassa для оплаты
```
