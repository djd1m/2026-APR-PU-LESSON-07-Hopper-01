# SMS Providers for Authentication in Russia

**Date:** 2026-05-12 | **Status:** Research Complete | **Decision:** SMSC.ru

---

## 1. Context

SMS-based OTP (One-Time Password) is the primary authentication method for Russian consumer applications. Unlike Western markets where email + password or social login dominate, Russian users expect SMS verification as the default sign-in method. This is reinforced by:

- High mobile penetration (170M+ mobile subscriptions in Russia)
- Regulatory preference for phone-verified identities
- User habit established by major Russian services (Yandex, VK, Sberbank, Tinkoff)
- Our target segments are mobile-first (87% of Gen Z book from smartphones -- [Hopper Media](https://media.hopper.com/research/activating-gen-z-and-the-future-of-travel))

---

## 2. Provider Comparison

| Feature | SMSC.ru | SMS.ru | SMS Aero | Twilio |
|---------|:-------:|:------:|:--------:|:------:|
| **Status** | Our choice | Alternative | Alternative | Blocked in Russia |
| **API type** | HTTP GET/POST | REST API | REST API | REST API |
| **Authentication** | Login + password (URL params) | API key (header) | API key + email | Account SID + Auth Token |
| **Price per SMS** | $0.02-0.05 | $0.03-0.06 | $0.02-0.04 (bulk) | N/A (blocked) |
| **Free tier** | No | 5 SMS/day | No | N/A |
| **Delivery rate (Russia)** | 97-99% | 95-98% | 96-99% | N/A |
| **Delivery speed** | 1-5 seconds | 2-10 seconds | 1-5 seconds | N/A |
| **Sender ID customization** | Yes | Yes | Yes | N/A |
| **Two-way SMS** | Yes | Limited | Yes | N/A |
| **Russian operator coverage** | All (MTS, Beeline, Megafon, Tele2) | All | All | N/A |
| **Documentation language** | Russian + English | Russian | Russian | English |
| **Minimum deposit** | 100 RUB (~$1.10) | Free registration | 500 RUB (~$5.50) | N/A |
| **API docs** | [smsc.ru/api](https://smsc.ru/api/) | [sms.ru/api](https://sms.ru/api/) | [smsaero.ru/api](https://smsaero.ru/api/) | N/A |

---

## 3. SMSC.ru -- Our Choice

### 3.1 Why SMSC.ru

1. **Lowest per-SMS cost** at our projected volumes ($0.02-0.05 depending on volume tier)
2. **Highest delivery rate** (97-99%) across all Russian mobile operators
3. **Simplest integration** -- HTTP GET with URL parameters, no SDK required
4. **Proven reliability** -- used by thousands of Russian web services
5. **Sender ID** -- custom sender name ("Hopper" instead of random number)
6. **Status callbacks** -- webhook for delivery confirmation

### 3.2 API Integration

**Send SMS:**
```
GET https://smsc.ru/sys/send.php?login=LOGIN&psw=PASSWORD&phones=79001234567&mes=Code:+1234&sender=Hopper
```

**Parameters:**
| Parameter | Required | Description |
|-----------|:--------:|-------------|
| `login` | Yes | Account login |
| `psw` | Yes | Password or MD5 hash |
| `phones` | Yes | Recipient phone (international format) |
| `mes` | Yes | Message text |
| `sender` | No | Sender ID (must be pre-registered) |
| `fmt` | No | Response format (1=numbers, 2=XML, 3=JSON) |
| `charset` | No | Message encoding (utf-8 default) |

**Response (JSON, fmt=3):**
```json
{
  "id": 12345,
  "cnt": 1,
  "cost": "1.80",
  "balance": "498.20"
}
```

**Check status:**
```
GET https://smsc.ru/sys/status.php?login=LOGIN&psw=PASSWORD&phone=79001234567&id=12345&fmt=3
```

### 3.3 Cost Projection

| Phase | SMS/month | Cost/SMS | Monthly Cost |
|-------|:---------:|:--------:|:------------:|
| MVP (M1-3) | 1,000 | $0.05 | ~$50 (4,500 RUB) |
| Growth (M6) | 10,000 | $0.035 | ~$350 (31,500 RUB) |
| Scale (M12) | 50,000 | $0.025 | ~$1,250 (112,500 RUB) |
| Maturity (M24) | 200,000 | $0.020 | ~$4,000 (360,000 RUB) |

### 3.4 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Credentials in URL params | Use HTTPS (mandatory); store credentials in environment variables |
| Password exposure in logs | Use MD5 hash instead of plaintext password |
| OTP interception (SS7 attack) | Implement rate limiting, OTP expiry (5 min), max 3 attempts |
| Spam/abuse | Rate limit: max 3 SMS per phone per 10 minutes |
| Cost abuse (enumeration attack) | CAPTCHA before sending SMS; phone number validation |

---

## 4. SMS.ru -- Alternative

### 4.1 Key Differentiator: Free Tier

SMS.ru offers 5 free SMS per day -- useful for development and testing without any cost.

**API Example:**
```
GET https://sms.ru/sms/send?api_id=YOUR_API_ID&to=79001234567&msg=Code:+1234&json=1
```

**Response:**
```json
{
  "status": "OK",
  "status_code": 100,
  "sms": {
    "79001234567": {
      "status": "OK",
      "status_code": 100,
      "sms_id": "000-00000"
    }
  },
  "balance": 500.00
}
```

### 4.2 When to Use SMS.ru

- **Development/testing** -- 5 free SMS/day covers dev needs
- **Backup provider** -- if SMSC.ru has delivery issues
- **A/B testing** -- compare delivery rates between providers

---

## 5. SMS Aero -- Bulk Pricing

SMS Aero offers the most competitive rates for high volumes (100K+ SMS/month). Consider switching at maturity phase.

| Volume/month | SMS Aero Price | SMSC.ru Price |
|:------------:|:--------------:|:-------------:|
| 1,000 | $0.04 | $0.05 |
| 10,000 | $0.03 | $0.035 |
| 100,000 | $0.018 | $0.022 |
| 500,000 | $0.015 | $0.018 |

---

## 6. Twilio -- Blocked in Russia

Twilio, the global standard for SMS/voice APIs, is **not available in Russia** due to Western sanctions and Twilio's compliance with them. Russian mobile operators do not route Twilio-originated messages.

**Impact:** Any architecture that depends on Twilio will not work for Russian users. This is a hard constraint, not a workaround-able limitation.

---

## 7. Alternative Authentication Methods

### 7.1 VK / OK Notifications

| Feature | Details |
|---------|---------|
| **Method** | Push notifications via VKontakte or Odnoklassniki social networks |
| **Cost** | Free |
| **Prerequisite** | User must have VK/OK account and grant notification permission |
| **Coverage** | VK: 100M+ Russian users; OK: 40M+ |
| **Reliability** | Dependent on user having VK app installed |
| **Use case** | Secondary auth method (not primary -- not all users have VK) |

### 7.2 Telegram Login Widget

| Feature | Details |
|---------|---------|
| **Method** | Telegram Login Widget for web; Telegram Bot API for in-bot auth |
| **Cost** | Free |
| **Prerequisite** | User must have Telegram account |
| **Coverage** | Was 90M+ in Russia (pre-blocking) |
| **Status (2026)** | Compromised by April 2026 blocking -- see `telegram-blocking-russia-2026.md` |
| **Recommendation** | Do NOT use as primary auth due to blocking; keep as optional |

### 7.3 Push OTP (Future)

For users with our PWA installed, push notifications can deliver OTP codes at zero cost. This is a Phase 2 optimization to reduce SMS costs.

---

## 8. Our Integration: auth.service.ts

### 8.1 Architecture

```
[User enters phone number]
    |
    v
[Rate Limiter] (max 3 SMS / phone / 10 min)
    |
    v
[OTP Generator] (6-digit, cryptographically random)
    |
    v
[SMS Provider Abstraction Layer]
    |
    +-- Primary: SMSC.ru
    +-- Fallback: SMS.ru (if SMSC.ru fails)
    |
    v
[Store OTP] (Redis, TTL: 300s, max 3 attempts)
    |
    v
[User enters OTP]
    |
    v
[Verify OTP] --> Success: Issue JWT + Refresh Token
                  Failure: Decrement attempts, block after 3
```

### 8.2 Provider Abstraction

The SMS provider is abstracted behind an interface, allowing us to switch providers without changing business logic:

```typescript
interface SMSProvider {
  sendOTP(phone: string, code: string): Promise<SMSResult>;
  checkStatus(messageId: string): Promise<DeliveryStatus>;
}

// Implementations: SMSCProvider, SMSRuProvider
// Selected via environment variable: SMS_PROVIDER=smsc|smsru
```

### 8.3 Configuration

```env
# .env.example
SMS_PROVIDER=smsc
SMSC_LOGIN=your_login
SMSC_PASSWORD_HASH=md5_of_password
SMSC_SENDER=Hopper
SMS_OTP_LENGTH=6
SMS_OTP_TTL_SECONDS=300
SMS_OTP_MAX_ATTEMPTS=3
SMS_RATE_LIMIT_WINDOW=600
SMS_RATE_LIMIT_MAX=3
```

---

## 9. Recommendation Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary SMS provider** | SMSC.ru | Best price/reliability ratio for Russian market |
| **Fallback provider** | SMS.ru | Free tier for dev; backup for production |
| **Scale provider (M18+)** | SMS Aero | Best bulk pricing at 100K+ volumes |
| **Primary auth method** | SMS OTP | Russian user expectation; universal coverage |
| **Secondary auth methods** | VK Login (optional), Push OTP (Phase 2) | Cost reduction, UX improvement |
| **Avoid** | Twilio (blocked), Telegram Login (blocked) | Sanctions and regulatory blocks |

---

## Sources

| # | Source | URL |
|---|--------|-----|
| 1 | SMSC.ru API Documentation | [https://smsc.ru/api/](https://smsc.ru/api/) |
| 2 | SMS.ru API Documentation | [https://sms.ru/api/](https://sms.ru/api/) |
| 3 | SMS Aero API Documentation | [https://smsaero.ru/api/](https://smsaero.ru/api/) |
| 4 | Twilio Status (Russia) | [https://www.twilio.com](https://www.twilio.com) |
| 5 | VK Login Documentation | [https://dev.vk.com/en/auth/](https://dev.vk.com/en/auth/) |
| 6 | Hopper Gen Z Mobile Stats | [https://media.hopper.com/research/activating-gen-z-and-the-future-of-travel](https://media.hopper.com/research/activating-gen-z-and-the-future-of-travel) |
| 7 | Phase 0 Discovery Brief (internal) | `docs/Phase0_Discovery_Brief.md` |
