# Toolkit Harvest: HopperRU
**Date:** 2026-05-12 | **Mode:** Full | **Extractor:** knowledge-extractor

---

## Extracted Artifacts

### 1. Patterns

#### P1: Travel Fintech OTA Pattern
**Category:** Architecture Pattern
**Maturity:** beta
**Description:** OTA (Online Travel Agency) that generates primary revenue from fintech protection products rather than booking commissions. Applicable to any marketplace where price volatility creates anxiety.

**Pattern:**
```
Revenue Model = Commission (baseline, low margin) + Fintech Products (high margin, 50%+)
Fintech Products:
  - Price Freeze: lock current price for fee (like options contract)
  - Cancel For Any Reason: full refund insurance
  - Price Drop Protection: post-purchase price monitoring + auto-refund
Core Insight: sell financial protection, not tickets
```

**Source:** Hopper ($850M revenue, 70%+ from fintech) → HopperRU adaptation

---

#### P2: Telegram-First Distribution Pattern
**Category:** Growth Pattern
**Maturity:** experimental
**Description:** Use Telegram as primary distribution channel instead of native mobile app. Applicable to Russian market (90M+ Telegram users) and other Telegram-dominant markets.

**Pattern:**
```
Channel 1: Telegram Bot (NL search, inline results, Telegram Payments)
Channel 2: Telegram Mini App (rich UI for calendar, dashboard)
Channel 3: Web App (SEO landing, full features)
Distribution: Viral sharing in Telegram chats (savings screenshots)
Result: 10x cheaper acquisition vs native app ($50-100 CAC vs $1-6 CPI)
```

**Source:** ADR-2, HopperRU Phase 0 Discovery

---

#### P3: Cold Start ML with TRIZ Dynamism
**Category:** ML Engineering Pattern
**Maturity:** beta
**Description:** Solve ML cold start problem with phased approach: rule-based → classical ML → deep learning. Each phase is independently deployable.

**Pattern:**
```
Phase 1 (Day 1): Rule-based with domain heuristics
  - Seasonal factors, day-of-week, advance purchase curves
  - 60-70% accuracy, zero training data needed
Phase 2 (3-6 months): Classical ML (gradient boosting)
  - Train on accumulated Phase 1 data
  - 80-85% accuracy, 50K+ data points
Phase 3 (12+ months): Deep Learning (LSTM/Transformer)
  - Train on large dataset
  - 90%+ accuracy, 1M+ data points
TRIZ Principle: #15 Dynamism — system adapts its capability over time
```

**Source:** ADR-3, packages/ml/models/predictor.py

---

### 2. Rules

#### R1: Russian Data Compliance Template
**Category:** Security Rule
**Applicable to:** Any project handling Russian user data

```markdown
# Russian Data Compliance (152-ФЗ)

## Mandatory
- [ ] All personal data stored on servers physically in Russia
- [ ] Roskomnadzor registration for personal data processing
- [ ] Privacy policy in Russian with 152-ФЗ required sections
- [ ] Data export mechanism for users (within 24 hours)
- [ ] Soft-delete (not hard-delete) for audit trail
- [ ] Consent collection with specific purposes listed

## Payment (MIR/SBP)
- [ ] YooKassa or equivalent (no Stripe — sanctions)
- [ ] MIR card support mandatory
- [ ] SBP (fast payments via QR) support
- [ ] Digital Ruble readiness by 09/2026

## Hosting
- [ ] Selectel, Yandex Cloud, or local VPS (not AWS/GCP/Azure)
```

---

#### R2: Fintech Product Validation Checklist
**Category:** Business Rule
**Applicable to:** Any fintech protection product

```markdown
# Fintech Product Validation

## Before Launch
- [ ] Insurance partner contract (if product transfers risk)
- [ ] ЦБ licensing check (is this insurance?)
- [ ] Terms of service reviewed by lawyer
- [ ] Actuarial model validates profitability at scale
- [ ] Edge cases documented (expiry, sold-out, double-claim)
- [ ] Refund SLA defined and testable

## Product-Specific
- Price Freeze: max duration, max coverage amount, refund on sold-out
- CFAR: cutoff time before departure, refund processing time
- Price Drop: monitoring period, minimum drop for refund, auto vs manual
```

---

### 3. Templates

#### T1: NestJS Module Template (HopperRU)
```
<module>/
├── <module>.module.ts    — @Module with imports, controllers, providers
├── <module>.controller.ts — @Controller with @ApiTags, DTOs, guards
├── <module>.service.ts   — Business logic, Prisma queries
├── <module>.dto.ts       — class-validator DTOs (Create, Update, Response)
└── <module>.spec.ts      — Jest unit tests
```

#### T2: Telegram Bot Command Template
```typescript
// commands/<name>.ts
import { Context } from 'telegraf';
import { ApiClient } from '../services/api-client';

export function register<Name>Command(bot: Telegraf, api: ApiClient) {
  bot.command('<name>', async (ctx: Context) => {
    // 1. Parse user input
    // 2. Call internal API
    // 3. Format response
    // 4. Reply with inline keyboard
  });
}
```

---

### 4. Snippets

#### S1: Russian Holiday Calendar (for ML prediction)
```python
RUSSIAN_HOLIDAYS_2026 = {
    '2026-01-01': 'Новый год', '2026-01-02': 'Новогодние каникулы',
    '2026-01-07': 'Рождество', '2026-02-23': 'День защитника',
    '2026-03-08': 'Международный женский день',
    '2026-05-01': 'День труда', '2026-05-09': 'День Победы',
    '2026-06-12': 'День России', '2026-11-04': 'День народного единства',
}
```

#### S2: Top-20 Russian Domestic Airports
```typescript
export const SUPPORTED_AIRPORTS = [
  'SVO', 'DME', 'VKO', 'LED', 'AER', 'KRR', 'SVX', 'OVB',
  'KZN', 'ROV', 'UFA', 'VOG', 'KGD', 'MRV', 'IKT', 'VVO',
  'TJM', 'PEE', 'GOJ', 'CEK',
] as const;
```

---

## Harvest Statistics

| Category | Extracted | Reusable |
|----------|:---------:|:--------:|
| Patterns | 3 | 3 |
| Rules | 2 | 2 |
| Templates | 2 | 2 |
| Snippets | 2 | 2 |
| Insights | 6 | 6 |
| **Total** | **15** | **15** |

## Cross-Project Applicability

| Artifact | Domains |
|----------|---------|
| P1 Travel Fintech OTA | Any price-volatile marketplace (tickets, hotels, car rental, crypto) |
| P2 Telegram-First | Any RU/CIS market consumer product |
| P3 Cold Start ML | Any ML product starting from zero data |
| R1 Russian Data Compliance | Any project with Russian users |
| R2 Fintech Validation | Any fintech protection product globally |
