# Telegram Blocking in Russia (April 2026)

**Date:** 2026-05-12 | **Status:** Active Event -- Architectural Impact | **Decision:** ADR-6 (Web-first + PWA Pivot)

---

## 1. Timeline

| Date | Event | Source |
|------|-------|--------|
| **April 2018** | First blocking attempt by Roskomnadzor. Failed due to Telegram's domain-fronting via AWS/Google Cloud. Collateral damage: millions of IPs blocked. | [Wikipedia](https://en.wikipedia.org/wiki/Blocking_of_Telegram_in_Russia) |
| **June 2020** | Roskomnadzor lifts the ban, citing Telegram's "willingness to cooperate" in counter-terrorism. | [Wikipedia](https://en.wikipedia.org/wiki/Blocking_of_Telegram_in_Russia) |
| **2021-2024** | Telegram grows to 90M+ Russian users. Becomes primary messaging platform, surpassing WhatsApp and VK Messenger. | [Statista](https://www.statista.com/statistics/1336297/russia-telegram-users/) |
| **Late 2024** | Pavel Durov arrested in France (August 2024). Russian authorities begin signaling renewed restrictions. | International media coverage |
| **Early 2025** | Partial restrictions begin. Chechnya and Dagestan block Telegram regionally (Kadyrov announces ban). Audio and video calls restricted nationwide. | [Fontanka](https://www.fontanka.ru), [AppleInsider.ru](https://appleinsider.ru) |
| **Q1 2026** | Escalating restrictions: message delivery delays, media download throttling, bot API intermittent failures. | [Hi-Tech Mail.ru](https://hi-tech.mail.ru) |
| **April 2026** | **Full nationwide block.** Roskomnadzor implements deep packet inspection (DPI) blocking. Telegram accessible only via VPN. | [Fontanka](https://www.fontanka.ru), [AppleInsider.ru](https://appleinsider.ru), [Hi-Tech Mail.ru](https://hi-tech.mail.ru) |

---

## 2. Technical Details of the 2026 Block

Unlike the 2018 attempt (IP-based blocking that failed), the 2026 block uses:

| Method | Description | Effectiveness |
|--------|-------------|:-------------:|
| **DPI (Deep Packet Inspection)** | TSPU equipment (installed at ISPs since 2019) identifies and blocks Telegram protocol signatures | High |
| **SNI filtering** | Blocks TLS connections to Telegram domains | High |
| **DNS poisoning** | Government-controlled DNS resolvers return false responses for Telegram domains | Medium (bypassed by custom DNS) |
| **IP blocking** | Telegram server IPs blocked (broader range than 2018) | Medium |

**Result:** Telegram is effectively blocked for casual users. Technical users can bypass via VPN, but this reduces the addressable market significantly.

---

## 3. Impact Assessment

### 3.1 User Impact

| Metric | Before Blocking | After Blocking (est.) | Source |
|--------|:---------------:|:--------------------:|--------|
| Russian Telegram users | 90M+ | ~65M (via VPN) | Durov's estimate (Telegram channel) |
| Daily active users (Russia) | ~50M | ~20-30M (VPN users) | Estimate based on VPN adoption rates |
| Bot API reliability | 99.9% | <50% (intermittent) | Developer reports |
| Telegram Payments | Available | Non-functional | Testing confirmed |

### 3.2 Impact on Our Project

Our Phase 0 Discovery Brief (Section M5) designed the primary growth loop around Telegram:

```
BEFORE (Original Plan):
Step 1: Telegram bot "Check your flight" -> free price check
Step 2: AI predicts "Wait 3 days -> save 6,000 RUB"
Step 3: Price Freeze via Telegram Payment
Step 4: Booking + Protection Bundle
Step 5: Share savings in Telegram chats -> viral loop
```

**All 5 steps are compromised by the blocking.**

The Discovery Brief identified Telegram as:
- Primary distribution channel (Section M5.B: Channel #1, CAC 50-100 RUB, Conv 8-15%)
- Part of the core growth flywheel
- Hypothesis H4: "Gen Z in Russia prefers Telegram bot format over standalone app"

---

## 4. Our Architectural Pivot (ADR-6)

### 4.1 New Strategy: Web-first + PWA

```
AFTER (Pivoted Plan):
Step 1: PWA web app (installable, works offline)
    |
Step 2: SEO-driven acquisition ("when is cheapest to fly to [city]")
    |
Step 3: VK Mini App as social distribution channel
    |
Step 4: WhatsApp for notifications (not blocked)
    |
Step 5: Telegram bot maintained as secondary channel (for VPN users)
```

### 4.2 Channel Priority Shift

| Priority | Before Blocking | After Blocking | CAC Change |
|:--------:|----------------|----------------|:----------:|
| #1 | Telegram Bot + Viral | **SEO + PWA** | 50-100 -> 30-80 RUB |
| #2 | SEO | **VK Mini App** | 30-80 -> 100-200 RUB |
| #3 | Yandex Direct + VK Ads | **Yandex Direct + VK Ads** | 200-400 RUB (unchanged) |
| #4 | (none) | **WhatsApp notifications** | ~0 (organic) |
| #5 | (none) | **Telegram Bot (VPN users)** | 50-100 RUB (reduced reach) |

### 4.3 PWA Advantages

| Feature | Native App | PWA | Telegram Bot |
|---------|:----------:|:---:|:------------:|
| Installation friction | High (App Store) | Low (Add to Home) | None (was) |
| Push notifications | Yes | Yes (Android, partial iOS) | Blocked |
| Offline capability | Yes | Yes (Service Worker) | No |
| App Store approval | Required | Not needed | N/A |
| Update distribution | Store review cycle | Instant | Instant (was) |
| Russian platform risk | Apple/Google could restrict | No platform dependency | Blocked |

---

## 5. VK Mini App as Alternative Distribution

### 5.1 Why VK

| Parameter | Details |
|-----------|---------|
| **Users** | 100M+ Russian users (not blocked, government-friendly) |
| **Mini Apps** | VK supports embedded web apps (similar to WeChat mini programs) |
| **Payments** | VK Pay integrated |
| **Audience overlap** | Strong overlap with our target segments (25-35 millennials, Gen Z) |
| **Developer platform** | [https://dev.vk.com](https://dev.vk.com) |
| **Distribution** | App catalog within VK, social sharing, VK Ads |

### 5.2 VK Mini App vs Standalone PWA

| Aspect | VK Mini App | Standalone PWA |
|--------|:-----------:|:--------------:|
| Reach | 100M+ VK users | Anyone with browser |
| Acquisition cost | Low (social sharing in VK) | SEO + paid |
| User data | VK provides profile, phone, friends | Must collect ourselves |
| Payment | VK Pay (limited) + redirect to YooKassa | YooKassa directly |
| Branding | VK frame around our UI | Full brand control |
| Platform dependency | Yes (VK) | No |

**Recommendation:** Build both. PWA is primary (no platform dependency). VK Mini App is a distribution channel wrapper around the same React codebase.

---

## 6. WhatsApp as Messaging Alternative

### 6.1 WhatsApp in Russia (2026)

| Parameter | Details |
|-----------|---------|
| **Status** | Not blocked (Meta products partially restricted, but WhatsApp exempt) |
| **Users in Russia** | ~70M+ |
| **Business API** | Available via official partners (360dialog, Gupshup, MessageBird) |
| **Cost** | Free for user-initiated conversations; $0.04-0.08/message for business-initiated |
| **Limitations** | No payment integration; strict anti-spam policies; 24-hour message window |

### 6.2 Our Usage of WhatsApp

| Use Case | Implementation | Cost |
|----------|---------------|------|
| Price alert notifications | WhatsApp Business API template messages | $0.04-0.08/message |
| Booking confirmations | Template message with booking details | $0.04-0.08/message |
| Customer support | 24-hour conversation window | Free (user-initiated) |
| **NOT for:** Auth OTP | Use SMS instead | N/A |
| **NOT for:** Booking flow | Use PWA/VK Mini App | N/A |

---

## 7. Telegram Bot -- Maintained for VPN Users

Despite the blocking, we maintain the Telegram bot as a secondary channel:

### 7.1 Rationale

- ~65M Russians reportedly still use Telegram via VPN (Durov's claim)
- VPN-using demographic skews tech-savvy and higher-income -- valuable segment
- Minimal maintenance cost (same backend API, different frontend)
- If blocking is lifted (as in 2020), we're immediately positioned

### 7.2 Limitations

- Cannot rely on Telegram for critical notifications (delivery not guaranteed)
- Telegram Payments non-functional -- redirect to web checkout
- Bot API intermittent -- implement retry logic with graceful degradation
- Cannot use as primary acquisition channel

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| VPN adoption drops, Telegram user base shrinks further | Medium | Low (we've already pivoted) | PWA is primary; Telegram is bonus |
| VK also gets restricted | Low | High | PWA has zero platform dependency |
| WhatsApp gets blocked (Meta sanctions) | Low-Medium | Medium | SMS fallback for notifications |
| Blocking is lifted (political change) | Low | Positive | Telegram bot ready to scale immediately |
| Apple restricts PWA on iOS (EU precedent) | Very Low | Medium | React Native shell app as backup |

---

## 9. Implementation Timeline

| Week | Action | Channel |
|------|--------|---------|
| W1-2 | PWA scaffold with offline support (Service Worker) | PWA |
| W3-4 | Core search + price prediction in PWA | PWA |
| W5-6 | VK Mini App wrapper (shared React components) | VK |
| W7-8 | WhatsApp Business API integration for notifications | WhatsApp |
| Ongoing | Maintain Telegram bot (reduced priority) | Telegram |

---

## 10. Lessons for Architecture

The Telegram blocking reinforces a critical architectural principle:

> **Never build a single-platform dependency for a core business function.**

Our architecture now follows:

```
[Shared Backend API]
    |
    +-- [PWA] (primary -- zero platform dependency)
    +-- [VK Mini App] (distribution -- VK platform)
    +-- [WhatsApp] (notifications -- Meta platform)
    +-- [Telegram Bot] (secondary -- blocked platform)
    +-- [Future: Native App] (if justified by scale)
```

Each frontend is a thin client consuming the same API. Losing any single channel does not compromise the business.

---

## Sources

| # | Source | URL | Notes |
|---|--------|-----|-------|
| 1 | Fontanka (Saint Petersburg news) | [https://www.fontanka.ru](https://www.fontanka.ru) | Coverage of 2025-2026 Telegram restrictions |
| 2 | AppleInsider.ru | [https://appleinsider.ru](https://appleinsider.ru) | Technical analysis of blocking methods |
| 3 | Hi-Tech Mail.ru | [https://hi-tech.mail.ru](https://hi-tech.mail.ru) | Telegram blocking timeline and user impact |
| 4 | Wikipedia: Telegram blocking | [https://en.wikipedia.org/wiki/Blocking_of_Telegram_in_Russia](https://en.wikipedia.org/wiki/Blocking_of_Telegram_in_Russia) | Historical context (2018-2020) |
| 5 | VK Developer Platform | [https://dev.vk.com](https://dev.vk.com) | Mini App documentation |
| 6 | WhatsApp Business API | [https://business.whatsapp.com/products/business-api](https://business.whatsapp.com/products/business-api) | Pricing and capabilities |
| 7 | Durov's Telegram Channel | Telegram (via VPN) | 65M users via VPN claim |
| 8 | Statista Telegram Russia | [https://www.statista.com/statistics/1336297/russia-telegram-users/](https://www.statista.com/statistics/1336297/russia-telegram-users/) | Pre-blocking user numbers |
| 9 | Phase 0 Discovery Brief (internal) | `docs/Phase0_Discovery_Brief.md` | Original Telegram-first strategy |
| 10 | Phase 0 Product Customers (internal) | `docs/Phase0_Product_Customers.md` | H4 hypothesis on Telegram preference |
