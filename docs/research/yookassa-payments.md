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

### Пошаговая инструкция

**Шаг 1: Регистрация в YooKassa (2 минуты)**

1. Открыть [yookassa.ru/joinups?createTestShop=true](https://yookassa.ru/joinups?createTestShop=true)
2. Ввести email, номер телефона, подтвердить SMS
3. На шаге выбора типа подключения — нажать **"Тестирование"** (не "Продолжить регистрацию")
4. Вы попадёте в личный кабинет YooKassa

**Шаг 2: Создание тестового магазина**

1. В личном кабинете [yookassa.ru/my/](https://yookassa.ru/my/) → нажать **"Добавить магазин"**
2. Выбрать тип: **"Тестовый магазин"**
3. Магазин появится в течение 1 минуты (макс. 20 тестовых магазинов)

**Шаг 3: Получение credentials**

1. Перейти в настройки тестового магазина
2. **Shop ID** — виден в разделе "Настройки → Магазин" (поле `shopId`)
3. **Secret Key** — получить в разделе "Интеграция → Ключи API" → нажать "Выпустить ключ"

**Шаг 4: Прописать в проекте**

```bash
# Добавить в .env
YOOKASSA_SHOP_ID=ваш_shop_id_из_шага_3
YOOKASSA_SECRET=ваш_secret_key_из_шага_3
```

**Шаг 5: Перезапустить API**

```bash
kill $(lsof -ti:7101); sleep 1
set -a && source .env && set +a
DATABASE_URL="postgresql://hopperru:${DB_PASSWORD}@127.0.0.1:${PG_PORT}/hopperru" \
REDIS_URL="redis://127.0.0.1:${REDIS_PORT}" \
ML_SERVICE_URL="http://127.0.0.1:${ML_PORT}" \
TRAVELPAYOUTS_TOKEN="${TRAVELPAYOUTS_TOKEN}" \
SMSC_LOGIN="${SMSC_LOGIN}" SMSC_PASSWORD="${SMSC_PASSWORD}" \
JWT_SECRET="${JWT_SECRET}" \
YOOKASSA_SHOP_ID="${YOOKASSA_SHOP_ID}" YOOKASSA_SECRET="${YOOKASSA_SECRET}" \
NODE_ENV=production PORT=7101 \
nohup node packages/api/dist/main.js > /tmp/hopperru-api.log 2>&1 &
```

**Шаг 6: Проверить**

При бронировании рейса пользователь будет перенаправлен на страницу оплаты YooKassa. Используйте тестовые карты:

| Карта | Номер | CVV | Срок | Результат |
|-------|-------|-----|------|-----------|
| Visa | `4111 1111 1111 1111` | любой | любой будущий | Успешная оплата |
| Mastercard | `5555 5555 5555 4444` | любой | любой будущий | Успешная оплата |
| MIR (3D Secure) | `2200 0000 0000 0004` | любой | любой будущий | Успех с 3DS |
| MC (нет средств) | `5555 5555 5555 4642` | любой | любой будущий | Отказ |
| MC (просрочена) | `5555 5555 5555 4543` | любой | любой будущий | Отказ |
| MC (неверный CVC) | `5555 5555 5555 4626` | любой | любой будущий | Отказ |

После оплаты пользователь будет возвращён на `/bookings`.

> **Важно:** тестовый магазин использует те же API endpoints что и production. Разница только в credentials — тестовые ключи автоматически включают тестовый режим. В ответах API будет поле `"test": true`.
