# Payment Systems in Russia (2026)

**Date:** 2026-05-12 | **Status:** Research Complete | **Decision:** YooKassa (ADR-4)

---

## 1. Context

Since 2022, Visa and Mastercard have suspended operations in Russia. The domestic payment landscape is now entirely built around MIR cards, SBP (fast payment system), and the upcoming Digital Ruble. This fundamentally shapes our payment integration strategy.

---

## 2. Payment Methods Available in Russia

### 2.1 MIR Cards

| Parameter | Details |
|-----------|---------|
| **Operator** | NSPK (National Payment Card System), subsidiary of Bank of Russia |
| **Market position** | Dominant domestic card network since Visa/MC exit (2022) |
| **Acceptance** | Universal within Russia; limited international acceptance (Turkey, some CIS) |
| **Card types** | Debit, credit, prepaid |
| **Contactless** | MIR Pay (NFC on Android); Apple Pay/Google Pay not available in Russia |
| **Online payments** | 3D Secure via MIR Accept |

**Source:** [GW2RU](https://www.gw2ru.com/plan-your-trip/245835-payments-in-russia-2026)

### 2.2 SBP (Sistema Bystrykh Platezhey / Fast Payment System)

| Parameter | Details |
|-----------|---------|
| **Operator** | Bank of Russia / NSPK |
| **Launched** | 2019 |
| **Mechanism** | QR-code based instant payments, phone-number-to-phone-number transfers |
| **Merchant fee** | 0.4-0.7% (vs 1.5-2.5% for card acquiring) |
| **Settlement** | Instant (real-time) |
| **Adoption** | Rapidly growing; mandatory acceptance for large merchants |
| **C2C transfers** | Free up to 100,000 RUB/month |

**Significance for us:** SBP fees are 3-5x lower than card acquiring. For a marketplace business with thin margins on booking commissions, SBP is the preferred payment rail.

### 2.3 Digital Ruble (CBDC)

| Parameter | Details |
|-----------|---------|
| **Status** | Law signed; pilot phase active |
| **Mandatory date** | **01.09.2026** for large businesses (revenue > specified threshold) |
| **Operator** | Bank of Russia |
| **Mechanism** | Central bank digital currency; wallet on CBR platform, accessed through commercial bank apps |
| **Merchant fee** | 0.3% (capped by law -- lowest of all options) |
| **Settlement** | Instant |
| **Programmability** | Supports programmable payments (earmarked spending, auto-escrow) |
| **Offline capability** | Planned for future phases |

**Source:** [CBR](https://cbr.ru/eng/psystem/)

**Impact on our project:**
- Must integrate Digital Ruble payment rail before September 2026
- Lowest transaction fees of any option (0.3%)
- Programmable payments could enable novel fintech features (e.g., automatic Price Freeze escrow, programmatic refunds for Cancel For Any Reason)

### 2.4 Bank Transfers (Online Banking)

Traditional bank transfers via online banking apps (Sberbank Online, Tinkoff, Alfa-Bank) remain available but are not commonly used for e-commerce due to friction.

---

## 3. Payment Gateways

### 3.1 YooKassa (Our Choice -- ADR-4)

| Parameter | Details |
|-----------|---------|
| **Formerly** | Yandex.Kassa (rebranded after Yandex ecosystem split) |
| **Owner** | Sberbank |
| **Market position** | Largest payment gateway in Russia |
| **Supported methods** | MIR cards, SBP, YooMoney (e-wallet), bank transfers, mobile carrier billing |
| **API** | REST/JSON, well-documented, SDKs for Python, PHP, Node.js |
| **Pricing** | 2.8-3.5% per card transaction; 0.4-0.7% for SBP |
| **Settlement** | Next business day (standard), same-day (premium) |
| **Recurring payments** | Supported (card tokenization) |
| **Refunds** | Full and partial refunds via API |
| **3D Secure** | Mandatory for MIR cards |
| **Onboarding** | 3-7 business days for legal entities |
| **Documentation** | [https://yookassa.ru/developers](https://yookassa.ru/developers) |

**Why YooKassa:**
1. Largest merchant base -- proven reliability at scale
2. Supports all required payment methods (MIR + SBP + e-wallets)
3. Best API documentation among Russian gateways
4. Sberbank backing ensures regulatory compliance
5. Will likely be among first to support Digital Ruble integration
6. Node.js SDK aligns with our tech stack

### 3.2 Alternatives Comparison

| Feature | YooKassa | CloudPayments | Tinkoff Acquiring | Robokassa |
|---------|:--------:|:-------------:|:-----------------:|:---------:|
| MIR cards | Yes | Yes | Yes | Yes |
| SBP | Yes | Yes | Yes | Yes |
| Digital Ruble (planned) | Likely first | TBD | Likely early | TBD |
| API quality | Excellent | Good | Good | Fair |
| Node.js SDK | Yes | Yes | No (REST only) | No |
| Recurring payments | Yes | Yes | Yes | Limited |
| Merchant fee (cards) | 2.8-3.5% | 2.5-3.5% | 2.0-2.8% | 3.5-5.0% |
| Merchant fee (SBP) | 0.4-0.7% | 0.4-0.7% | 0.4-0.7% | N/A |
| Settlement speed | T+1 | T+1 | T+1 | T+2 |
| Onboarding speed | 3-7 days | 1-3 days | 5-10 days | 1-3 days |
| Market share | #1 | #3 | #2 | #4 |
| Refund API | Full + partial | Full + partial | Full + partial | Full only |
| Documentation | [yookassa.ru/developers](https://yookassa.ru/developers) | [cloudpayments.ru/docs](https://cloudpayments.ru/docs) | [www.tinkoff.ru/kassa/develop](https://www.tinkoff.ru/kassa/develop) | [docs.robokassa.ru](https://docs.robokassa.ru) |

### 3.3 Tinkoff Acquiring -- Notable Alternative

Tinkoff has the lowest card processing fees (2.0-2.8%) and strong API. However:
- Tinkoff already operates Tinkoff Travel (potential competitor)
- Dependency on a competitor's payment infrastructure creates strategic risk
- YooKassa's Sberbank backing is more neutral

### 3.4 CloudPayments -- Fast Onboarding

CloudPayments offers the fastest onboarding (1-3 days) and competitive pricing. Good backup option if YooKassa onboarding delays occur.

---

## 4. BNPL (Buy Now Pay Later)

Growing trend in Russian e-commerce, increasingly relevant for travel:

| Provider | Model | Integration | Notes |
|----------|-------|-------------|-------|
| **Dolyame** (Tinkoff) | 4 installments, 0% | Via Tinkoff Acquiring | Largest BNPL in Russia |
| **SberPay Installments** | 3-12 months | Via YooKassa | Growing adoption |
| **Yandex Split** | 2-6 months | Standalone integration | Yandex ecosystem |

**Relevance:** BNPL aligns with our target segments. Gen Z travelers (30% of Hopper's base) prefer debit + BNPL over credit cards. 42% of Gen Z prefer debit cards, 30% prefer Apple Pay/BNPL. -- [Hopper Media](https://media.hopper.com/research/activating-gen-z-and-the-future-of-travel)

**Recommendation:** Integrate BNPL in Phase 2 (M6+). Start with SberPay Installments via YooKassa (no additional integration needed).

---

## 5. Fee Comparison by Payment Method

| Payment Method | Gateway Fee | Bank/Network Fee | Total Cost | Settlement |
|----------------|:-----------:|:----------------:|:----------:|:----------:|
| MIR Card (YooKassa) | 2.8-3.5% | Included | **2.8-3.5%** | T+1 |
| SBP (YooKassa) | 0.4-0.7% | Included | **0.4-0.7%** | Instant |
| Digital Ruble (2026) | 0.3% | Included | **0.3%** | Instant |
| YooMoney wallet | 2.0-3.0% | Included | **2.0-3.0%** | T+1 |
| Bank transfer | Fixed ~30 RUB | Included | **~30 RUB** | T+1 to T+3 |

**Optimization strategy:**
- Default to SBP (lowest fees) -- show QR code prominently
- Offer MIR card as secondary option
- Integrate Digital Ruble by August 2026 (before mandatory deadline)
- Estimated blended rate: 1.2-1.8% (assuming 60% SBP, 35% MIR, 5% other)

---

## 6. Integration Architecture

```
User Checkout
    |
    v
[Payment Service]
    |
    +-- YooKassa API (primary)
    |       |
    |       +-- MIR Card (3D Secure)
    |       +-- SBP (QR code)
    |       +-- YooMoney
    |       +-- SberPay Installments (BNPL)
    |
    +-- Digital Ruble API (Sept 2026)
    |       |
    |       +-- CBR Digital Ruble platform
    |
    v
[Payment Webhook Handler]
    |
    +-- payment.succeeded --> Confirm booking
    +-- payment.canceled --> Release inventory
    +-- refund.succeeded --> Update user balance
    |
    v
[Reconciliation Service] (daily)
```

### 6.1 YooKassa API Flow

```
1. Create Payment (POST /v3/payments)
   - amount, currency (RUB), payment_method_data
   - confirmation: { type: "redirect", return_url: "..." }
   - metadata: { booking_id, user_id }

2. Redirect user to YooKassa hosted page
   - 3D Secure for MIR cards
   - QR code for SBP
   - Wallet auth for YooMoney

3. Receive webhook (payment.waiting_for_capture or payment.succeeded)
   - Verify webhook signature
   - Capture payment (if two-stage)
   - Confirm booking

4. Handle refunds (POST /v3/refunds)
   - Full or partial refund
   - Used for Cancel For Any Reason, Price Drop Protection
```

---

## 7. Fintech Product Payment Flows

| Product | Payment Flow | Refund Flow |
|---------|-------------|-------------|
| **Booking** | Standard payment -> capture -> ticket | Cancel -> refund (airline policy) |
| **Price Freeze** | Upfront fee (2,000-3,000 RUB) -> hold for 21 days | If price drops -> no refund (service delivered); if not exercised -> partial refund |
| **Cancel For Any Reason** | Premium added to booking total | Full booking refund on cancellation (insurance partner pays) |
| **Price Drop Protection** | Premium (1,000-2,000 RUB) at booking | Difference refund if price drops within 10 days |

---

## 8. Tradeoffs of YooKassa Choice

| Advantage | Disadvantage |
|-----------|--------------|
| Market leader -- proven at scale | Higher card fees than Tinkoff (2.8% vs 2.0%) |
| All payment methods in one integration | Sberbank ownership may concern some users |
| Best documentation + Node.js SDK | Settlement T+1 (not instant for cards) |
| Will likely support Digital Ruble early | Onboarding slower than CloudPayments |
| Neutral platform (not a travel competitor) | Revenue share with Sberbank |

**Net assessment:** YooKassa is the right choice for MVP. The fee difference vs Tinkoff (~0.8%) is offset by strategic neutrality and superior developer experience. At scale (M12+), consider multi-gateway strategy with Tinkoff for lower card rates.

---

## Sources

| # | Source | URL |
|---|--------|-----|
| 1 | YooKassa Developer Documentation | [https://yookassa.ru/developers](https://yookassa.ru/developers) |
| 2 | Bank of Russia Payment Systems | [https://cbr.ru/eng/psystem/](https://cbr.ru/eng/psystem/) |
| 3 | GW2RU Payments in Russia 2026 | [https://www.gw2ru.com/plan-your-trip/245835-payments-in-russia-2026](https://www.gw2ru.com/plan-your-trip/245835-payments-in-russia-2026) |
| 4 | CloudPayments Documentation | [https://cloudpayments.ru/docs](https://cloudpayments.ru/docs) |
| 5 | Tinkoff Acquiring | [https://www.tinkoff.ru/kassa/develop](https://www.tinkoff.ru/kassa/develop) |
| 6 | Robokassa Documentation | [https://docs.robokassa.ru](https://docs.robokassa.ru) |
| 7 | Hopper Gen Z Research | [https://media.hopper.com/research/activating-gen-z-and-the-future-of-travel](https://media.hopper.com/research/activating-gen-z-and-the-future-of-travel) |
| 8 | Phase 0 Discovery Brief (internal) | `docs/Phase0_Discovery_Brief.md` |
