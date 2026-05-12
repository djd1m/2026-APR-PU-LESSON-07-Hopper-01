# Security Rules: HopperRU

Non-negotiable security requirements derived from Specification NFRs, Russian regulations,
and fintech industry standards. Every code change must comply.

## 152-FZ Data Localization

Russian Federal Law 152-FZ mandates that personal data of Russian citizens is stored
and processed on servers physically located in Russia.

| Requirement | Implementation |
|-------------|---------------|
| Data storage location | All PostgreSQL, Redis, ClickHouse instances on Russian-hosted VPS (Selectel or Yandex Cloud) |
| PII classification | Name, email, phone, passport, IP address, Telegram ID -- all classified as personal data |
| Cross-border transfer | Prohibited without explicit user consent. No PII sent to non-Russian third-party services. |
| Data minimization | Collect only what is necessary. Analytics data anonymized after 90 days. |
| User data deletion | Soft delete immediately on request. Hard delete PII within 30 days. Retain anonymized analytics. |
| Data processing register | Maintain a register of all PII processing operations (who, what, why, retention). |
| Consent | Explicit consent for data processing at registration. Separate consent for marketing communications. |

**Enforcement:** Before adding any new third-party service or SDK, verify its data processing location. If the service processes data outside Russia, it cannot receive PII.

## PCI DSS for Payments

HopperRU does not store, process, or transmit cardholder data directly. All payment processing is delegated to YooKassa (PCI DSS Level 1 certified).

| Rule | Details |
|------|---------|
| No card data storage | Never store card numbers, CVV, expiry dates. Use YooKassa tokenization. |
| No card data in logs | Payment logs must not contain card numbers. Log only: payment_id, amount, status, timestamp. |
| API key security | YooKassa `shopId` and `secretKey` stored in Docker secrets. Never in code, environment files committed to git, or client-side code. |
| Webhook validation | Validate YooKassa webhook requests by IP allowlist AND notification signature. Reject unverified webhooks. |
| HTTPS only | All payment-related communication over TLS 1.2+. No HTTP fallback. |
| Quarterly key rotation | Rotate YooKassa API keys every 90 days. Document rotation in ops runbook. |

## OWASP Top 10 Mitigations

### A01: Broken Access Control
- JWT-based authentication on all API endpoints (except public search)
- Role-based access: `user`, `admin`, `support`
- Users can only access their own bookings, freezes, protections (`user_id` check in every query)
- Admin endpoints on a separate route prefix (`/api/v1/admin/`) with IP allowlist

### A02: Cryptographic Failures
- Passenger passport numbers: AES-256-GCM per-field encryption at application level
- Phone and email: encrypted at rest in PostgreSQL
- Encryption keys: stored in Docker secrets, separate from database credentials
- JWT signing: RS256 (asymmetric keys), not HS256

### A03: Injection
- All database queries through Prisma ORM (parameterized by default)
- ESLint rule banning `$queryRawUnsafe` in all packages
- Input validation on all API endpoints via `class-validator` DTOs
- No string interpolation in any query construction

### A04: Insecure Design
- Threat modeling for all fintech features before implementation
- Price Freeze: server-side price verification at payment time (never trust client price)
- Booking: server-side seat availability check at payment time
- CFAR: server-side departure time check for 24-hour rule

### A05: Security Misconfiguration
- `helmet` middleware on NestJS API (HSTS, X-Frame-Options, X-Content-Type-Options, CSP)
- No debug endpoints in production (enforce via `NODE_ENV` check)
- Docker images run as non-root user
- `.env` files in `.gitignore`, never committed
- Default credentials changed for all services (PostgreSQL, Redis, ClickHouse)

### A06: Vulnerable Components
- `npm audit` and `pip audit` in CI pipeline (fail on high/critical)
- Dependabot enabled for automatic dependency updates
- Lock files committed (`package-lock.json`, `requirements.lock`)
- No `*` version ranges in `package.json`

### A07: Authentication Failures
- Account lockout: 5 failed login attempts -> 15 min cooldown
- CAPTCHA after 3 failed attempts
- Refresh token rotation: new refresh token on every use, old one invalidated
- Telegram auth: validate `hash` using HMAC-SHA-256 with bot token

### A08: Data Integrity Failures
- YooKassa webhook signature verification before processing
- Booking state machine: only valid transitions allowed (e.g., PENDING -> CONFIRMED, never CANCELLED -> CONFIRMED)
- Price Freeze: re-validate price at payment time, not at page load

### A09: Security Logging and Monitoring
- See Audit Logging section below
- Prometheus metrics for failed auth attempts, payment failures, rate limit hits
- Alerting on anomalous patterns (>10 failed logins from same IP in 5 min)

### A10: Server-Side Request Forgery (SSRF)
- No user-controlled URLs in server-side HTTP requests
- Airline API URLs configured in environment variables (allowlist)
- Image proxy: allowlist of CDN domains only

## JWT Authentication Requirements

| Parameter | Value |
|-----------|-------|
| Algorithm | RS256 (asymmetric) |
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days |
| Token storage (client) | httpOnly, secure, SameSite=Strict cookie (web); secure storage (mobile/bot) |
| Refresh rotation | Issue new refresh token on every refresh; invalidate old one |
| Claims | `sub` (user_id), `iat`, `exp`, `roles`, `jti` (unique token ID) |
| Revocation | Maintain blacklist in Redis (`revoked:{jti}`, TTL = token remaining lifetime) |
| Telegram auth | Separate flow: validate Telegram hash -> issue JWT pair |

## Passenger Data Encryption (AES-256)

```
Encryption: AES-256-GCM
Key management: per-environment master key in Docker secrets
Key derivation: HKDF from master key + field name (unique derived key per field type)
Encrypted fields:
  - passenger.passport_number
  - user.phone
  - user.email
Storage format: Base64(IV + ciphertext + auth_tag)
Decryption: on-demand only (never bulk decrypt for listings)
Key rotation: supported via dual-key read (try new key, fallback to old, re-encrypt on read)
```

**Access control:** Only the owning service may decrypt. BookingService decrypts passport on demand (for airline API submission). UserService decrypts phone/email for notifications. No other service has decrypt access.

## Rate Limiting

| Scope | Limit | Window | Action on Exceed |
|-------|-------|--------|------------------|
| Per user (authenticated) | 100 requests | 1 minute | HTTP 429 + `Retry-After` header |
| Per IP (unauthenticated) | 50 requests | 1 minute | HTTP 429 + `Retry-After` header |
| Search endpoint | 30 requests | 1 minute | HTTP 429 + cached results suggestion |
| Payment endpoint | 10 requests | 1 minute | HTTP 429 + alert to monitoring |
| Login endpoint | 5 attempts | 15 minutes | HTTP 429 + account lockout |

**Implementation:** Redis-backed sliding window counter. If Redis is down, rate limiting degrades to best-effort (in-memory per-instance counter).

## Audit Logging

### What to Log

| Event Category | Examples |
|----------------|----------|
| Authentication | Login (success/fail), logout, token refresh, account lockout |
| Authorization | Access denied, role change, admin action |
| Payment | Payment created, confirmed, failed, refunded |
| Fintech product | Freeze created/used/expired, protection purchased/claimed/paid |
| Booking lifecycle | Created, confirmed, ticketed, cancelled |
| Data access | PII viewed, passport decrypted, data export requested |
| Data modification | Profile updated, data deletion requested/completed |
| System | Service startup/shutdown, configuration change, deployment |

### Log Format

```json
{
  "timestamp": "2026-05-12T10:00:00.000Z",
  "level": "info",
  "event": "payment.confirmed",
  "userId": "uuid",
  "resourceType": "payment",
  "resourceId": "yookassa-payment-id",
  "ip": "masked-ip",
  "userAgent": "truncated",
  "result": "success",
  "metadata": {
    "amount": 15000,
    "currency": "RUB",
    "method": "sbp"
  }
}
```

### What NOT to Log

- Passwords (even hashed)
- JWT tokens
- Card numbers or payment credentials
- Full passport numbers (log last 4 digits only)
- Encryption keys or secrets
- Full request/response bodies (log only structured fields)

### Retention

- Security events: 1 year (regulatory requirement)
- Payment events: 5 years (tax compliance)
- General application logs: 90 days
- Access logs (with IPs): 30 days (then rotate)

## Forbidden Practices

- Storing payment card data in any form
- Transmitting PII to servers outside Russia
- Using `eval()`, `Function()`, or dynamic code execution
- Disabling HTTPS in any environment (including development -- use self-signed certs)
- Committing secrets, API keys, or credentials to git
- Using `*` CORS origins in production
- Running Docker containers as root
- Using deprecated cryptographic algorithms (MD5, SHA1, DES, RC4)
- Logging sensitive data (passwords, tokens, card numbers, passport numbers)
