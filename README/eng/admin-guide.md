# HopperRU -- Administrator Guide

## Contents

1. [System Requirements](#system-requirements)
2. [Installation and First Launch](#installation-and-first-launch)
3. [Configuration](#configuration)
4. [Updating](#updating)
5. [Backups](#backups)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)

---

## System Requirements

### Minimum Server Configuration

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 16 GB | 32 GB |
| Disk | 100 GB SSD | 250 GB NVMe |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Network | 100 Mbit/s | 1 Gbit/s |

### Software

| Component | Version | Purpose |
|-----------|---------|---------|
| Docker | 24+ | Containerization of all services |
| Docker Compose | 2.20+ | Container orchestration |
| PostgreSQL | 16 | Primary data storage |
| Redis | 7 | Cache, job queues, sessions |
| ClickHouse | 23+ | Price data analytics (optional for MVP) |
| Node.js | 20 LTS | Backend, Frontend, Telegram Bot |
| Python | 3.11+ | ML price prediction service |
| Git | 2.40+ | Version control |
| pnpm | 9+ | Package manager (monorepo) |
| Nginx | 1.24+ | Reverse proxy, SSL termination |

### Hosting Requirements

The server **must** be located in the Russian Federation (Federal Law 152-FZ on Personal Data). Recommended providers:

- Selectel
- Yandex Cloud
- AdminVPS / HOSTKEY
- VK Cloud

---

## Installation and First Launch

### Step 1. Clone the Repository

```bash
git clone git@github.com:your-org/hopperru.git
cd hopperru
```

### Step 2. Create the Environment File

```bash
cp .env.example .env
```

Open `.env` and fill in the required variables (see [Configuration](#configuration)).

### Step 3. Generate Security Keys

```bash
# JWT keys for authentication
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# Encryption master key
openssl rand -hex 32
# Copy the output to .env as ENCRYPTION_MASTER_KEY
```

### Step 4. Start All Services

```bash
docker compose up --build -d
```

### Step 5. Apply Database Migrations

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed   # staging/dev only
```

### Step 6. Verify the Installation

```bash
# Check container status
docker compose ps

# Check the API
curl http://localhost:7101/health

# Check the web application
curl -s -o /dev/null -w "%{http_code}" http://localhost:7100

# Check Swagger documentation
curl -s -o /dev/null -w "%{http_code}" http://localhost:7101/api/docs
```

Expected results: API returns `{"status":"ok"}`, web application and Swagger return HTTP 200.

---

## Configuration

All parameters are set via environment variables in the `.env` file.

### Core Parameters

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime mode | `production` | Yes |
| `PORT` | API server port | `7101` | Yes |
| `WEB_PORT` | Web application port | `7100` | Yes |
| `ML_PORT` | ML service port | `9102` | Yes |

### Database

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://hopperru:password@postgres:5432/hopperru` | Yes |
| `DATABASE_POOL_MIN` | Minimum pool connections | `5` | No |
| `DATABASE_POOL_MAX` | Maximum pool connections | `20` | No |

### Redis

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection string | `redis://redis:6379` | Yes |
| `REDIS_PASSWORD` | Redis password | `secure_redis_pass` | Yes (prod) |

### ClickHouse

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `CLICKHOUSE_URL` | ClickHouse address | `http://clickhouse:8123` | No (MVP) |
| `CLICKHOUSE_DATABASE` | Database name | `hopperru_analytics` | No (MVP) |

### Authentication

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_PRIVATE_KEY_PATH` | Path to JWT private key | `./jwt-private.pem` | Yes |
| `JWT_PUBLIC_KEY_PATH` | Path to JWT public key | `./jwt-public.pem` | Yes |
| `JWT_ACCESS_TTL` | Access token lifetime | `15m` | No |
| `JWT_REFRESH_TTL` | Refresh token lifetime | `7d` | No |
| `ENCRYPTION_MASTER_KEY` | Encryption master key | `(hex, 64 characters)` | Yes |

### Telegram Bot (optional -- ADR-6)

> **Important:** Telegram is blocked in Russia since April 2026 (ADR-6). The Web app + PWA is the PRIMARY interface. Telegram Bot is optional for VPN users.

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `123456:ABC-DEF1234ghIkl-zyx` | No (optional) |
| `TELEGRAM_WEBHOOK_URL` | Webhook URL | `https://api.hopperru.ru/bot/webhook` | No |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook verification secret | `random_secret_string` | No |

### SMS Notifications (SMSC.ru)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SMSC_LOGIN` | SMSC.ru login | `my_login` | Yes |
| `SMSC_PASSWORD` | SMSC.ru password | `my_password` | Yes |
| `SMSC_SENDER` | Sender name | `HopperRU` | No |

### Payments (YooKassa)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `YOOKASSA_SHOP_ID` | YooKassa shop ID | `1357789` | Yes |
| `YOOKASSA_SECRET_KEY` | YooKassa secret key | `live_...` | Yes |
| `YOOKASSA_WEBHOOK_SECRET` | Webhook verification secret | `webhook_secret` | Yes |
| `YOOKASSA_RETURN_URL` | Return URL after payment | `https://hopperru.ru/payment/complete` | Yes |

### ML Service

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `ML_SERVICE_URL` | ML service address | `http://ml:8000` | Yes |
| `ML_MODEL_PATH` | Path to model file | `/app/models/price_v1.pkl` | No |
| `ML_PREDICTION_TIMEOUT` | Prediction timeout (ms) | `5000` | No |

### External APIs (Airlines and Prices)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `TRAVELPAYOUTS_TOKEN` | Travelpayouts Data API token | `token_...` | Yes |
| `AMADEUS_API_KEY` | Amadeus API key | `key_...` | No (needs credentials) |
| `AMADEUS_API_SECRET` | Amadeus API secret | `secret_...` | No |
| `NEMO_TRAVEL_URL` | Nemo.travel BookingProvider URL | `https://...` | No (needs contract) |
| `NEMO_TRAVEL_API_KEY` | Nemo.travel API key | `key_...` | No |
| `AIRLINE_API_TIMEOUT` | Request timeout (ms) | `10000` | No |
| `AIRLINE_API_RETRY_COUNT` | Number of retries | `3` | No |

> **Note:** Search uses a cascading provider strategy: Amadeus (if credentials available) -> Travelpayouts (real prices) -> Mock (fallback). Nemo.travel BookingProvider is ready for integration after contract signing.

---

## Updating

### Standard Update

```bash
cd /opt/hopperru

# Stop services
docker compose down

# Pull updates
git pull origin main

# Rebuild containers
docker compose build

# Apply migrations
docker compose up -d postgres redis
sleep 5
docker compose exec api npx prisma migrate deploy

# Start all services
docker compose up -d
```

### Zero-Downtime Update (Blue-Green)

```bash
# Build new images
docker compose build

# Update with minimal downtime
docker compose up -d --no-deps --build api
docker compose up -d --no-deps --build web
docker compose up -d --no-deps --build bot
docker compose up -d --no-deps --build ml
```

### Rollback

```bash
# Roll back to a previous version
git log --oneline -5            # find the desired commit
git checkout <commit-hash>
docker compose build
docker compose up -d
```

---

## Backups

### PostgreSQL

#### Manual Backup

```bash
# Full database dump
docker compose exec postgres pg_dump -U hopperru -d hopperru \
  --format=custom --compress=9 \
  -f /var/lib/postgresql/backups/hopperru_$(date +%Y%m%d_%H%M%S).dump

# Copy to host
docker cp $(docker compose ps -q postgres):/var/lib/postgresql/backups/ ./backups/
```

#### Restoring from Backup

```bash
# Restore the database
docker compose exec postgres pg_restore -U hopperru -d hopperru \
  --clean --if-exists \
  /var/lib/postgresql/backups/hopperru_20260512_120000.dump
```

### Redis

#### Manual Backup

```bash
# Create an RDB snapshot
docker compose exec redis redis-cli BGSAVE

# Copy the file to host
docker cp $(docker compose ps -q redis):/data/dump.rdb ./backups/redis_$(date +%Y%m%d_%H%M%S).rdb
```

#### Restoring Redis

```bash
docker compose stop redis
docker cp ./backups/redis_20260512_120000.rdb $(docker compose ps -q redis):/data/dump.rdb
docker compose start redis
```

### Automation via cron

Add to crontab (`crontab -e`):

```cron
# Daily PostgreSQL backup at 03:00
0 3 * * * /opt/hopperru/scripts/backup-postgres.sh >> /var/log/hopperru/backup.log 2>&1

# Daily Redis backup at 03:30
30 3 * * * /opt/hopperru/scripts/backup-redis.sh >> /var/log/hopperru/backup.log 2>&1

# Delete backups older than 30 days
0 4 * * * find /opt/hopperru/backups -mtime +30 -delete
```

Example `scripts/backup-postgres.sh`:

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

### Backup Storage

- Local: `/opt/hopperru/backups/` (minimum 7 days retention)
- Remote: S3-compatible storage (Yandex Object Storage, Selectel S3)
- Encrypt backups before transfer: `gpg --symmetric --cipher-algo AES256`

---

## Monitoring

### Prometheus + Grafana

HopperRU exports metrics in Prometheus format.

#### Metrics Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| API | `http://localhost:7101/metrics` | HTTP metrics, business metrics |
| ML | `http://localhost:9102/metrics` | Prediction metrics |
| PostgreSQL | `http://localhost:9187/metrics` | Via postgres_exporter |
| Redis | `http://localhost:9121/metrics` | Via redis_exporter |
| Node Exporter | `http://localhost:9100/metrics` | System metrics (CPU, RAM, disk) |

#### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_requests_total` | Total HTTP requests | -- |
| `http_request_duration_seconds` | API response time | p95 > 2s |
| `search_requests_total` | Number of search requests | -- |
| `booking_success_rate` | Successful booking rate | < 90% |
| `payment_success_rate` | Successful payment rate | < 95% |
| `prediction_accuracy` | Price prediction accuracy | < 65% |
| `price_freeze_active_count` | Active price freezes | > 10000 |
| `db_connection_pool_usage` | DB connection pool utilization | > 80% |
| `redis_memory_usage_bytes` | Redis memory consumption | > 80% of maxmemory |
| `queue_job_waiting_count` | BullMQ job queue | > 1000 |

#### Grafana Setup

Import ready-made dashboards:

```bash
# Start the monitoring stack
docker compose --profile monitoring up -d

# Grafana is available at http://localhost:3100
# Default login: admin / admin
```

### Logging

All services write logs to stdout/stderr in JSON format. For centralized collection:

```bash
# View logs for a specific service
docker compose logs -f api --tail=100
docker compose logs -f bot --tail=100

# View logs for all services
docker compose logs -f --tail=50
```

### Health-check Endpoints

| Service | URL | Checks |
|---------|-----|--------|
| API | `GET /health` | DB, Redis, external APIs |
| Web | `GET /api/health` | API availability |
| ML | `GET /health` | Model loaded, DB accessible |
| Bot | Built-in check | Telegram API polling/webhook |

---

## Troubleshooting

### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::7101`

**Solution:**

```bash
# Find the process using the port
lsof -i :7101

# Kill the process
kill -9 <PID>

# Or change the port in .env
PORT=7102
```

### Database Connection Refused

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**

```bash
# Check PostgreSQL status
docker compose ps postgres

# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker compose logs postgres --tail=50

# Verify DATABASE_URL in .env
# Inside Docker network use the service name: postgres:5432
# Outside Docker network: localhost:5432
```

### Redis Connection Error

**Symptom:** `ECONNREFUSED` or `NOAUTH Authentication required`

**Solution:**

```bash
# Check Redis
docker compose exec redis redis-cli ping
# Expected response: PONG

# If authentication is required
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping

# Verify REDIS_URL in .env
# Format: redis://:password@redis:6379
```

### YooKassa Timeout

**Symptom:** `YooKassa API request timed out` or `Error 504`

**Solution:**

1. Check YooKassa API availability: `curl -s https://api.yookassa.ru/v3/me -u <SHOP_ID>:<SECRET_KEY>`
2. Increase the timeout: `YOOKASSA_TIMEOUT=30000` (default is 10000 ms)
3. Check if your IP is blocked on YooKassa side (test/live mode)
4. Verify that `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` are correct

### Telegram Bot Not Responding

**Symptom:** The bot does not react to commands in Telegram

**Solution:**

```bash
# Check bot logs
docker compose logs bot --tail=100

# Verify that the token is valid
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"

# For production: check the webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# Re-register the webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${TELEGRAM_WEBHOOK_URL}&secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

### ML Service Not Returning Predictions

**Symptom:** Predictions unavailable, API returns fallback values

**Solution:**

```bash
# Check the ML service
curl http://localhost:9102/health

# Check logs
docker compose logs ml --tail=100

# Check if the model is loaded
curl http://localhost:9102/model/status

# Restart
docker compose restart ml
```

### Migrations Not Applying

**Symptom:** `Error: P3009 migrate found failed migrations`

**Solution:**

```bash
# Check migration status
docker compose exec api npx prisma migrate status

# Reset a failed migration (WARNING: data loss!)
docker compose exec api npx prisma migrate resolve --rolled-back <migration_name>

# Apply migrations again
docker compose exec api npx prisma migrate deploy
```

### Disk Space Exhausted

**Symptom:** Containers crash, logs contain `No space left on device`

**Solution:**

```bash
# Check free space
df -h

# Clean unused Docker resources
docker system prune -f
docker volume prune -f

# Truncate old logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

---

## Security

### 152-FZ Compliance Checklist

HopperRU processes user personal data and must comply with Federal Law 152-FZ "On Personal Data".

- [ ] Server is located in the Russian Federation
- [ ] Notification to Roskomnadzor about personal data processing has been filed
- [ ] Personal data processing policy is published on the website
- [ ] User consent for personal data processing has been obtained
- [ ] Personal data is encrypted at rest (AES-256)
- [ ] Personal data is encrypted in transit (TLS 1.2+)
- [ ] A mechanism for deleting personal data upon subject request is implemented
- [ ] An access log for personal data is maintained
- [ ] A responsible person for personal data processing is appointed
- [ ] A personal data security threat assessment has been conducted

### SSL/TLS

```bash
# Install Certbot for Let's Encrypt
apt install certbot python3-certbot-nginx

# Obtain a certificate
certbot --nginx -d hopperru.ru -d www.hopperru.ru -d api.hopperru.ru

# Auto-renewal (already configured via systemd timer)
certbot renew --dry-run
```

Minimum requirements:
- TLS 1.2 and above
- Disable TLS 1.0, 1.1, SSL 3.0
- ECDSA P-256 or RSA 2048+ certificate

### Nginx Configuration (Example)

```nginx
server {
    listen 443 ssl http2;
    server_name api.hopperru.ru;

    ssl_certificate /etc/letsencrypt/live/api.hopperru.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.hopperru.ru/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # Security headers
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
# Default rules
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable the firewall
ufw enable

# Check status
ufw status verbose
```

### Additional Recommendations

1. **Secrets** -- never commit `.env`, keys, or passwords. Use `.env.example` as a template.
2. **Updates** -- regularly update base Docker images and dependencies.
3. **Rate limiting** -- configured at the API level (100 req/min per user). Additionally configure at Nginx level.
4. **Auditing** -- enable detailed logging for critical operations (payments, personal data changes).
5. **Access** -- use SSH keys, disable password authentication.
6. **Docker** -- do not run containers as root; use an unprivileged user.
7. **Scanning** -- regularly scan images: `docker scan <image>` or Trivy.
