# HopperRU -- Руководство администратора

## Содержание

1. [Системные требования](#системные-требования)
2. [Установка и первый запуск](#установка-и-первый-запуск)
3. [Конфигурация](#конфигурация)
4. [Обновление](#обновление)
5. [Бэкапы](#бэкапы)
6. [Мониторинг](#мониторинг)
7. [Траблшутинг](#траблшутинг)
8. [Безопасность](#безопасность)

---

## Системные требования

### Минимальная конфигурация сервера

| Ресурс | Минимум | Рекомендуется |
|--------|---------|---------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 16 GB | 32 GB |
| Диск | 100 GB SSD | 250 GB NVMe |
| ОС | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Сеть | 100 Mbit/s | 1 Gbit/s |

### Программное обеспечение

| Компонент | Версия | Назначение |
|-----------|--------|------------|
| Docker | 24+ | Контейнеризация всех сервисов |
| Docker Compose | 2.20+ | Оркестрация контейнеров |
| PostgreSQL | 16 | Основное хранилище данных |
| Redis | 7 | Кеш, очереди задач, сессии |
| ClickHouse | 23+ | Аналитика ценовых данных (опционально для MVP) |
| Node.js | 20 LTS | Backend, Frontend, Telegram Bot |
| Python | 3.11+ | ML-сервис предсказания цен |
| Git | 2.40+ | Управление версиями |
| pnpm | 9+ | Менеджер пакетов (monorepo) |
| Nginx | 1.24+ | Reverse proxy, SSL termination |

### Требования к хостингу

Сервер **обязан** находиться на территории РФ (152-ФЗ). Рекомендуемые провайдеры:

- Selectel
- Yandex Cloud
- AdminVPS / HOSTKEY
- VK Cloud

---

## Установка и первый запуск

### Шаг 1. Клонирование репозитория

```bash
git clone git@github.com:your-org/hopperru.git
cd hopperru
```

### Шаг 2. Создание файла окружения

```bash
cp .env.example .env
```

Откройте `.env` и заполните обязательные переменные (см. раздел [Конфигурация](#конфигурация)).

### Шаг 3. Генерация ключей безопасности

```bash
# JWT-ключи для аутентификации
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# Мастер-ключ шифрования
openssl rand -hex 32
# Скопируйте результат в .env как ENCRYPTION_MASTER_KEY
```

### Шаг 4. Запуск всех сервисов

```bash
docker compose up --build -d
```

### Шаг 5. Применение миграций базы данных

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed   # только для staging/dev
```

### Шаг 6. Проверка работоспособности

```bash
# Проверка статуса контейнеров
docker compose ps

# Проверка API
curl http://localhost:7101/health

# Проверка веб-приложения
curl -s -o /dev/null -w "%{http_code}" http://localhost:7100

# Проверка Swagger-документации
curl -s -o /dev/null -w "%{http_code}" http://localhost:7101/api/docs
```

Ожидаемые ответы: API возвращает `{"status":"ok"}`, веб-приложение и Swagger возвращают HTTP 200.

---

## Конфигурация

Все параметры задаются через переменные окружения в файле `.env`.

### Основные параметры

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `NODE_ENV` | Режим работы | `production` | Да |
| `PORT` | Порт API-сервера | `7101` | Да |
| `WEB_PORT` | Порт веб-приложения | `7100` | Да |
| `ML_PORT` | Порт ML-сервиса | `9102` | Да |

### База данных

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://hopperru:password@postgres:5432/hopperru` | Да |
| `DATABASE_POOL_MIN` | Минимум соединений в пуле | `5` | Нет |
| `DATABASE_POOL_MAX` | Максимум соединений в пуле | `20` | Нет |

### Redis

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `REDIS_URL` | Строка подключения к Redis | `redis://redis:6379` | Да |
| `REDIS_PASSWORD` | Пароль Redis | `secure_redis_pass` | Да (prod) |

### ClickHouse

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `CLICKHOUSE_URL` | Адрес ClickHouse | `http://clickhouse:8123` | Нет (MVP) |
| `CLICKHOUSE_DATABASE` | Имя базы данных | `hopperru_analytics` | Нет (MVP) |

### Аутентификация

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `JWT_PRIVATE_KEY_PATH` | Путь к приватному JWT-ключу | `./jwt-private.pem` | Да |
| `JWT_PUBLIC_KEY_PATH` | Путь к публичному JWT-ключу | `./jwt-public.pem` | Да |
| `JWT_ACCESS_TTL` | Время жизни access-токена | `15m` | Нет |
| `JWT_REFRESH_TTL` | Время жизни refresh-токена | `7d` | Нет |
| `ENCRYPTION_MASTER_KEY` | Мастер-ключ шифрования | `(hex, 64 символа)` | Да |

### Telegram Bot (опционально -- ADR-6)

> **Важно:** Telegram заблокирован в РФ с апреля 2026 (ADR-6). Web-приложение + PWA является PRIMARY интерфейсом. Telegram Bot -- опция для пользователей с VPN.

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather | `123456:ABC-DEF1234ghIkl-zyx` | Нет (опционально) |
| `TELEGRAM_WEBHOOK_URL` | URL для webhook | `https://api.hopperru.ru/bot/webhook` | Нет |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет для верификации webhook | `random_secret_string` | Нет |

### SMS-уведомления (SMSC.ru)

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `SMSC_LOGIN` | Логин SMSC.ru | `my_login` | Да |
| `SMSC_PASSWORD` | Пароль SMSC.ru | `my_password` | Да |
| `SMSC_SENDER` | Имя отправителя | `HopperRU` | Нет |

### Платежи (YooKassa)

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `YOOKASSA_SHOP_ID` | ID магазина в YooKassa | `1357789` | Да |
| `YOOKASSA_SECRET_KEY` | Секретный ключ YooKassa | `live_...` | Да |
| `YOOKASSA_WEBHOOK_SECRET` | Секрет для верификации webhook | `webhook_secret` | Да |
| `YOOKASSA_RETURN_URL` | URL возврата после оплаты | `https://hopperru.ru/payment/complete` | Да |

### ML-сервис

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `ML_SERVICE_URL` | Адрес ML-сервиса | `http://ml:8000` | Да |
| `ML_MODEL_PATH` | Путь к модели | `/app/models/price_v1.pkl` | Нет |
| `ML_PREDICTION_TIMEOUT` | Таймаут предсказания (мс) | `5000` | Нет |

### Внешние API (авиакомпании и цены)

| Переменная | Описание | Пример | Обязательна |
|------------|----------|--------|-------------|
| `TRAVELPAYOUTS_TOKEN` | Токен Travelpayouts Data API | `token_...` | Да |
| `AMADEUS_API_KEY` | Ключ Amadeus API | `key_...` | Нет (нужны credentials) |
| `AMADEUS_API_SECRET` | Секрет Amadeus API | `secret_...` | Нет |
| `NEMO_TRAVEL_URL` | URL Nemo.travel BookingProvider | `https://...` | Нет (нужен контракт) |
| `NEMO_TRAVEL_API_KEY` | Ключ API Nemo.travel | `key_...` | Нет |
| `AIRLINE_API_TIMEOUT` | Таймаут запроса к API (мс) | `10000` | Нет |
| `AIRLINE_API_RETRY_COUNT` | Количество повторных попыток | `3` | Нет |

> **Примечание:** Поиск использует каскадную стратегию провайдеров: Amadeus (если credentials) -> Travelpayouts (реальные цены) -> Mock (fallback). Nemo.travel BookingProvider готов к интеграции после подписания контракта.

---

## Обновление

### Стандартное обновление

```bash
cd /opt/hopperru

# Остановка сервисов
docker compose down

# Получение обновлений
git pull origin main

# Пересборка контейнеров
docker compose build

# Применение миграций
docker compose up -d postgres redis
sleep 5
docker compose exec api npx prisma migrate deploy

# Запуск всех сервисов
docker compose up -d
```

### Обновление без простоя (Blue-Green)

```bash
# Сборка новых образов
docker compose build

# Обновление с минимальным простоем
docker compose up -d --no-deps --build api
docker compose up -d --no-deps --build web
docker compose up -d --no-deps --build bot
docker compose up -d --no-deps --build ml
```

### Откат

```bash
# Откат к предыдущей версии
git log --oneline -5            # найти нужный коммит
git checkout <commit-hash>
docker compose build
docker compose up -d
```

---

## Бэкапы

### PostgreSQL

#### Ручной бэкап

```bash
# Полный дамп базы данных
docker compose exec postgres pg_dump -U hopperru -d hopperru \
  --format=custom --compress=9 \
  -f /var/lib/postgresql/backups/hopperru_$(date +%Y%m%d_%H%M%S).dump

# Копирование на хост
docker cp $(docker compose ps -q postgres):/var/lib/postgresql/backups/ ./backups/
```

#### Восстановление из бэкапа

```bash
# Восстановление базы данных
docker compose exec postgres pg_restore -U hopperru -d hopperru \
  --clean --if-exists \
  /var/lib/postgresql/backups/hopperru_20260512_120000.dump
```

### Redis

#### Ручной бэкап

```bash
# Создание RDB-снимка
docker compose exec redis redis-cli BGSAVE

# Копирование файла на хост
docker cp $(docker compose ps -q redis):/data/dump.rdb ./backups/redis_$(date +%Y%m%d_%H%M%S).rdb
```

#### Восстановление Redis

```bash
docker compose stop redis
docker cp ./backups/redis_20260512_120000.rdb $(docker compose ps -q redis):/data/dump.rdb
docker compose start redis
```

### Автоматизация через cron

Добавьте в crontab (`crontab -e`):

```cron
# Ежедневный бэкап PostgreSQL в 03:00
0 3 * * * /opt/hopperru/scripts/backup-postgres.sh >> /var/log/hopperru/backup.log 2>&1

# Ежедневный бэкап Redis в 03:30
30 3 * * * /opt/hopperru/scripts/backup-redis.sh >> /var/log/hopperru/backup.log 2>&1

# Удаление бэкапов старше 30 дней
0 4 * * * find /opt/hopperru/backups -mtime +30 -delete
```

Пример скрипта `scripts/backup-postgres.sh`:

```bash
#!/bin/bash
set -euo pipefail
BACKUP_DIR="/opt/hopperru/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker compose -f /opt/hopperru/docker-compose.yml exec -T postgres \
  pg_dump -U hopperru -d hopperru --format=custom --compress=9 \
  > "$BACKUP_DIR/hopperru_${TIMESTAMP}.dump"

echo "[$(date)] PostgreSQL backup completed: hopperru_${TIMESTAMP}.dump"
```

### Хранение бэкапов

- Локально: `/opt/hopperru/backups/` (минимум 7 дней)
- Удаленно: S3-совместимое хранилище (Yandex Object Storage, Selectel S3)
- Рекомендуется шифрование бэкапов перед передачей: `gpg --symmetric --cipher-algo AES256`

---

## Мониторинг

### Prometheus + Grafana

HopperRU экспортирует метрики в формате Prometheus.

#### Endpoints метрик

| Сервис | URL | Описание |
|--------|-----|----------|
| API | `http://localhost:7101/metrics` | HTTP-метрики, бизнес-метрики |
| ML | `http://localhost:9102/metrics` | Метрики предсказаний |
| PostgreSQL | `http://localhost:9187/metrics` | Через postgres_exporter |
| Redis | `http://localhost:9121/metrics` | Через redis_exporter |
| Node Exporter | `http://localhost:9100/metrics` | Системные метрики (CPU, RAM, диск) |

#### Ключевые метрики для мониторинга

| Метрика | Описание | Порог алерта |
|---------|----------|--------------|
| `http_requests_total` | Общее количество HTTP-запросов | -- |
| `http_request_duration_seconds` | Время ответа API | p95 > 2s |
| `search_requests_total` | Количество поисковых запросов | -- |
| `booking_success_rate` | Доля успешных бронирований | < 90% |
| `payment_success_rate` | Доля успешных оплат | < 95% |
| `prediction_accuracy` | Точность предсказания цен | < 65% |
| `price_freeze_active_count` | Активные заморозки цен | > 10000 |
| `db_connection_pool_usage` | Использование пула соединений БД | > 80% |
| `redis_memory_usage_bytes` | Потребление памяти Redis | > 80% от maxmemory |
| `queue_job_waiting_count` | Очередь задач BullMQ | > 1000 |

#### Настройка Grafana

Импортируйте готовые дашборды:

```bash
# Запуск мониторинг-стека
docker compose --profile monitoring up -d

# Grafana доступна на http://localhost:3100
# Логин по умолчанию: admin / admin
```

### Логирование

Все сервисы пишут логи в stdout/stderr в формате JSON. Для централизованного сбора используйте:

```bash
# Просмотр логов конкретного сервиса
docker compose logs -f api --tail=100
docker compose logs -f bot --tail=100

# Просмотр логов всех сервисов
docker compose logs -f --tail=50
```

### Health-check endpoints

| Сервис | URL | Проверяет |
|--------|-----|-----------|
| API | `GET /health` | БД, Redis, внешние API |
| Web | `GET /api/health` | Доступность API |
| ML | `GET /health` | Модель загружена, БД доступна |
| Bot | Встроенная проверка | Telegram API polling/webhook |

---

## Траблшутинг

### Порт занят

**Симптом:** `Error: listen EADDRINUSE: address already in use :::7101`

**Решение:**

```bash
# Найти процесс, занимающий порт
lsof -i :7101

# Остановить процесс
kill -9 <PID>

# Или изменить порт в .env
PORT=7102
```

### Database connection refused

**Симптом:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Решение:**

```bash
# Проверить статус PostgreSQL
docker compose ps postgres

# Перезапустить PostgreSQL
docker compose restart postgres

# Проверить логи
docker compose logs postgres --tail=50

# Проверить DATABASE_URL в .env
# Внутри Docker-сети используйте имя сервиса: postgres:5432
# Снаружи Docker-сети: localhost:5432
```

### Redis connection error

**Симптом:** `ECONNREFUSED` или `NOAUTH Authentication required`

**Решение:**

```bash
# Проверить Redis
docker compose exec redis redis-cli ping
# Ожидаемый ответ: PONG

# Если требуется авторизация
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping

# Проверить REDIS_URL в .env
# Формат: redis://:password@redis:6379
```

### YooKassa timeout

**Симптом:** `YooKassa API request timed out` или `Error 504`

**Решение:**

1. Проверьте доступность YooKassa API: `curl -s https://api.yookassa.ru/v3/me -u <SHOP_ID>:<SECRET_KEY>`
2. Увеличьте таймаут: `YOOKASSA_TIMEOUT=30000` (по умолчанию 10000 мс)
3. Проверьте, не заблокирован ли IP на стороне YooKassa (тестовый/боевой режим)
4. Убедитесь, что `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY` корректны

### Telegram бот не отвечает

**Симптом:** Бот не реагирует на команды в Telegram

**Решение:**

```bash
# Проверить логи бота
docker compose logs bot --tail=100

# Убедиться, что токен корректен
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"

# Для production: проверить webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# Переустановить webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${TELEGRAM_WEBHOOK_URL}&secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

### ML-сервис не возвращает предсказания

**Симптом:** Предсказания недоступны, API возвращает fallback-значения

**Решение:**

```bash
# Проверить ML-сервис
curl http://localhost:9102/health

# Проверить логи
docker compose logs ml --tail=100

# Проверить, что модель загружена
curl http://localhost:9102/model/status

# Перезапуск
docker compose restart ml
```

### Миграции не применяются

**Симптом:** `Error: P3009 migrate found failed migrations`

**Решение:**

```bash
# Посмотреть статус миграций
docker compose exec api npx prisma migrate status

# Сбросить проблемную миграцию (ВНИМАНИЕ: потеря данных!)
docker compose exec api npx prisma migrate resolve --rolled-back <migration_name>

# Применить миграции заново
docker compose exec api npx prisma migrate deploy
```

### Нехватка дискового пространства

**Симптом:** Контейнеры аварийно останавливаются, логи содержат `No space left on device`

**Решение:**

```bash
# Проверить свободное место
df -h

# Очистить неиспользуемые Docker-ресурсы
docker system prune -f
docker volume prune -f

# Очистить старые логи
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

---

## Безопасность

### Чеклист 152-ФЗ

HopperRU обрабатывает персональные данные пользователей и обязан соответствовать 152-ФЗ "О персональных данных".

- [ ] Сервер расположен на территории РФ
- [ ] Уведомление Роскомнадзора о начале обработки ПДн подано
- [ ] Политика обработки персональных данных опубликована на сайте
- [ ] Получено согласие пользователей на обработку ПДн
- [ ] Персональные данные шифруются при хранении (AES-256)
- [ ] Персональные данные шифруются при передаче (TLS 1.2+)
- [ ] Реализован механизм удаления ПДн по запросу субъекта
- [ ] Ведется журнал доступа к ПДн
- [ ] Назначено ответственное лицо за обработку ПДн
- [ ] Проведена оценка угроз безопасности ПДн

### SSL/TLS

```bash
# Установка Certbot для Let's Encrypt
apt install certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d hopperru.ru -d www.hopperru.ru -d api.hopperru.ru

# Автопродление (уже настроено через systemd timer)
certbot renew --dry-run
```

Минимальные требования:
- TLS 1.2 и выше
- Отключить TLS 1.0, 1.1, SSL 3.0
- Сертификат ECDSA P-256 или RSA 2048+

### Настройка Nginx (пример)

```nginx
server {
    listen 443 ssl http2;
    server_name api.hopperru.ru;

    ssl_certificate /etc/letsencrypt/live/api.hopperru.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.hopperru.ru/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # Заголовки безопасности
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://127.0.0.1:7101;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall (UFW)

```bash
# Базовые правила
ufw default deny incoming
ufw default allow outgoing

# Разрешить SSH
ufw allow 22/tcp

# Разрешить HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Активировать firewall
ufw enable

# Проверить статус
ufw status verbose
```

### Дополнительные рекомендации

1. **Секреты** -- никогда не коммитьте `.env`, ключи, пароли. Используйте `.env.example` как шаблон.
2. **Обновления** -- регулярно обновляйте базовые Docker-образы и зависимости.
3. **Rate limiting** -- настроен на уровне API (100 req/min per user). Дополнительно настройте на Nginx.
4. **Аудит** -- включите подробное логирование для критичных операций (платежи, изменение ПДн).
5. **Доступ** -- используйте SSH-ключи, отключите парольную аутентификацию.
6. **Docker** -- не запускайте контейнеры от root; используйте непривилегированного пользователя.
7. **Сканирование** -- регулярно сканируйте образы: `docker scan <image>` или Trivy.
