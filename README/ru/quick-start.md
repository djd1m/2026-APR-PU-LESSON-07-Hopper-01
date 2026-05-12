# HopperRU -- Быстрый старт

Запуск HopperRU за 5 минут.

---

## 3 команды для запуска

```bash
# 1. Клонировать и настроить
git clone git@github.com:your-org/hopperru.git && cd hopperru
cp .env.example .env        # Заполните TELEGRAM_BOT_TOKEN, YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY

# 2. Запустить все сервисы
docker compose up --build -d

# 3. Применить миграции БД
docker compose exec api npx prisma migrate deploy
```

---

## Проверка работоспособности

```bash
# API
curl http://localhost:3000/health
# Ожидаемый ответ: {"status":"ok"}

# Web-приложение
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
# Ожидаемый ответ: 200

# Swagger-документация
open http://localhost:3000/api/docs
```

---

## Первый поиск через API

```bash
curl -X GET "http://localhost:3000/api/search/flights?\
origin=SVO&destination=AER&departureDate=2026-07-15" \
  -H "Content-Type: application/json"
```

Ответ содержит список рейсов с ценами, AI-предсказаниями и количеством доступных мест.

---

## Порты сервисов

| Сервис | URL |
|--------|-----|
| API (NestJS) | http://localhost:3000 |
| Web (Next.js) | http://localhost:3001 |
| ML (FastAPI) | http://localhost:8000 |
| Swagger Docs | http://localhost:3000/api/docs |
| Grafana | http://localhost:3100 |

---

## Полные руководства

| Документ | Описание |
|----------|----------|
| [Руководство администратора](./admin-guide.md) | Установка, конфигурация, бэкапы, мониторинг, безопасность |
| [Руководство пользователя](./user-guide.md) | Поиск, бронирование, заморозка цен, финансовая защита |
| [Документация API](./api-docs.md) | Endpoints, аутентификация, форматы запросов/ответов |
