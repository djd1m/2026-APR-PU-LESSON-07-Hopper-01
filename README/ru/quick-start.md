# HopperRU -- Быстрый старт

Запуск HopperRU за 5 минут.

---

## 3 команды для запуска

```bash
# 1. Клонировать и настроить
git clone git@github.com:your-org/hopperru.git && cd hopperru
cp .env.example .env        # Заполните YOOKASSA_SHOP_ID (1357789), YOOKASSA_SECRET_KEY, AMADEUS_API_KEY, SMSC_LOGIN/SMSC_PASSWORD

# 2. Запустить все сервисы
docker compose up --build -d

# 3. Применить миграции БД
docker compose exec api npx prisma migrate deploy
```

---

## Проверка работоспособности

```bash
# API
curl http://localhost:7101/health
# Ожидаемый ответ: {"status":"ok"}

# Web-приложение (Next.js PWA)
curl -s -o /dev/null -w "%{http_code}" http://localhost:7100
# Ожидаемый ответ: 200

# Swagger-документация
open http://localhost:7101/api/docs
```

---

## Первый поиск через API

```bash
curl -X GET "http://localhost:7101/api/search/flights?\
origin=SVO&destination=AER&departureDate=2026-07-15" \
  -H "Content-Type: application/json"
```

Ответ содержит список рейсов с ценами, AI-предсказаниями и количеством доступных мест.

---

## Порты сервисов

| Сервис | URL |
|--------|-----|
| Web (Next.js PWA) | http://localhost:7100 |
| API (NestJS) | http://localhost:7101 |
| ML (FastAPI) | http://localhost:9102 |
| Swagger Docs | http://localhost:7101/api/docs |
| Grafana | http://localhost:3100 |

> **Примечание:** Порты 7100-7101 выбраны для избежания конфликтов на VPS (порт 9100 заблокирован извне). ML-сервис доступен на порту 9102.

---

## Текущее состояние проекта

- **65+ коммитов**, 250+ файлов
- **Web-first + PWA** -- основной интерфейс (ADR-6: Telegram заблокирован в РФ с апреля 2026)
- **YooKassa** -- реальные платежи в тестовом режиме (shopId=1357789)
- **Travelpayouts** -- реальные цены на авиабилеты
- **Amadeus API** -- интеграция добавлена (требуются учетные данные)
- **Nemo.travel BookingProvider** -- готов (требуется контракт)
- **SMSC.ru** -- реальная отправка SMS
- Per-feature документация: `docs/features/`
- 8 исследовательских документов: `docs/research/`

---

## Полные руководства

| Документ | Описание |
|----------|----------|
| [Руководство администратора](./admin-guide.md) | Установка, конфигурация, бэкапы, мониторинг, безопасность |
| [Руководство пользователя](./user-guide.md) | Поиск, бронирование, заморозка цен, финансовая защита |
| [Документация API](./api-docs.md) | Endpoints, аутентификация, форматы запросов/ответов |
