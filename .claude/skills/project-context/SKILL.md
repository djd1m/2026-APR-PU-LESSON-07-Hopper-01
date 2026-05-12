---
name: project-context
description: >
  Domain knowledge skill for HopperRU. Provides travel industry terminology,
  Russian market specifics, Hopper reference model, business metrics, and
  customer segment definitions. Use when you need background context for any
  HopperRU feature planning, implementation, or review task.
version: "1.0"
maturity: production
---

# Project Context: HopperRU

## What This Skill Provides

Domain knowledge and business context for the HopperRU platform. Load this skill when you need to understand the business domain, industry terminology, regulatory environment, or target market.

## Travel Industry Terminology

### GDS (Global Distribution System)
A computerized network/platform that enables transactions between travel industry service providers (airlines, hotels, car rentals) and travel agencies/booking platforms. Major GDS providers: Amadeus, Sabre, Travelport. In Russia, Sirena-Travel is the primary domestic GDS. HopperRU integrates with airline APIs directly and via aggregators for MVP, with GDS integration planned for v2.0.

### PNR (Passenger Name Record)
A unique alphanumeric code (typically 6 characters, e.g., "ABC123") assigned to a booking by the airline or GDS. The PNR is the primary reference for retrieving and managing a booking. HopperRU stores the PNR after airline booking confirmation for post-booking operations (check-in, changes, cancellation).

### IATA Codes
- **Airport codes** (3 letters): SVO (Sheremetyevo), DME (Domodedovo), VKO (Vnukovo), LED (Pulkovo), AER (Sochi), IST (Istanbul)
- **Airline codes** (2 letters): SU (Aeroflot), S7 (S7 Airlines), DP (Pobeda), U6 (Ural Airlines), FV (Rossiya)
- **City codes**: MOW (Moscow, all airports), LED (Saint Petersburg)

### E-ticket
An electronic ticket record stored in the airline's reservation system. Replaces paper tickets. Contains: passenger name, itinerary, fare, ticket number. HopperRU delivers e-ticket confirmation via Telegram message and email.

### Fare Classes
Booking classes that determine ticket price and rules (refundability, change fees). Economy: Y, B, M, H, K, L, Q, T, N, V, S. Business: J, C, D, I. HopperRU displays simplified classes: ECONOMY, BUSINESS.

### Load Factor
The percentage of available seats that are filled on a flight. A high load factor (>85%) suggests prices will increase. Used as a feature in the ML prediction model.

### Codeshare
When two airlines sell seats on the same physical flight under different flight numbers. Important for HopperRU to deduplicate search results (same flight appearing as SU-1234 and FV-5678).

## Russian Market Specifics

### Payment Methods

| Method | Description | Market Share | HopperRU Support |
|--------|-------------|:------------:|:----------------:|
| MIR | Russian national payment card system (NSPK) | ~35% of card payments | YES (via YooKassa) |
| SBP (Sistema Bystryh Platezhej) | Instant bank-to-bank transfer via QR/phone | ~25% of online payments | YES (via YooKassa) |
| Visa/Mastercard | International cards | Limited (domestic only) | NO (sanctioned out of Russia) |
| Digital Ruble | CBDC, mandatory integration by 09.2026 | Emerging | PLANNED (v2.0) |
| YooKassa | Payment gateway (formerly Yandex.Kassa) | N/A (infrastructure) | YES (primary gateway) |

**Key constraint:** Visa and Mastercard no longer process transactions in Russia. MIR + SBP are mandatory for any Russian consumer service.

### 152-FZ (Federal Law on Personal Data)

Russian data protection law requiring:
- Personal data of Russian citizens stored on servers in Russia
- Explicit user consent for data processing
- Right to data deletion
- Data breach notification to Roskomnadzor within 24 hours
- Tightening requirements from 01.07.2025

HopperRU compliance: all infrastructure on Russian VPS (Selectel/Yandex Cloud), PII encryption at rest, soft delete + hard delete lifecycle, consent collection at registration.

### Insurance Regulation

CFAR (Cancel For Any Reason) products require a licensed insurance partner (licensed by the Central Bank of Russia). HopperRU cannot issue insurance directly. Partnership model: HopperRU as an insurance agent, AlfaStrakhovanie/Ingosstrakh as the underwriter.

### Russian Airlines (MVP Coverage)

| Airline | Code | Hub | Notes |
|---------|------|-----|-------|
| Aeroflot | SU | SVO | National carrier, largest network |
| S7 Airlines | S7 | OVB, DME | Second largest, strong domestic |
| Pobeda | DP | VKO | Low-cost (Aeroflot subsidiary) |
| Ural Airlines | U6 | SVX | Regional carrier |
| Rossiya | FV | LED | Aeroflot subsidiary, Saint Petersburg hub |

### Top-20 Domestic Routes (MVP)

Moscow (MOW) to: Sochi (AER), Saint Petersburg (LED), Kaliningrad (KGD), Ekaterinburg (SVX), Novosibirsk (OVB), Krasnodar (KRR), Kazan (KZN), Vladivostok (VVO), Mineralnye Vody (MRV), Simferopol (SIP).

Saint Petersburg (LED) to: Sochi (AER), Kaliningrad (KGD), Moscow (MOW), Ekaterinburg (SVX), Krasnodar (KRR).

Inter-regional: Novosibirsk-Sochi, Ekaterinburg-Sochi, Krasnodar-Moscow, Kazan-Sochi, Rostov-Moscow.

## Hopper Reference Model

### Company Overview
Hopper is a Canadian travel app that generated $850M+ revenue in 2024, with 70%+ coming from fintech products (not booking commissions). Valued at $5B+ (IPO planned). Key insight: Hopper transformed travel booking from a transaction into a financial product.

### Revenue Model

| Revenue Stream | % of Revenue | Hopper Mechanism | HopperRU Adaptation |
|----------------|:------------:|------------------|---------------------|
| Fintech products | 70%+ | Price Freeze, CFAR, PDP, Disruption | Same products, Russian insurance partner |
| Booking commissions | 20% | GDS commissions, hotel margin | Airline API commissions, hotel TBD |
| B2B (HTS) | 10% | White-label SDK for travel companies | Phase 2: Bank partnerships (Tinkoff, Sber) |

### Key Business Principle
**Fintech > Commission.** The primary revenue driver is NOT booking fees but the sale of protection products attached to bookings. Every product decision should optimize for "fintech attach rate" (% of bookings that include at least one protection product).

### Hopper's AI Advantage
Hopper's price prediction algorithm processes billions of price points daily and claims 95% accuracy. This drives user trust, which drives fintech product sales. HopperRU starts with rule-based 70% accuracy (sufficient for MVP trust-building) and scales to ML as data accumulates.

## Key Business Metrics

| Metric | Target (Year 1) | Hopper Benchmark | Measurement |
|--------|:----------------:|:----------------:|-------------|
| Fintech attach rate | 30%+ | 50%+ | % bookings with >= 1 protection |
| Gross margin | 50%+ | 60%+ | (Revenue - COGS) / Revenue |
| Price prediction accuracy | 70% (rule) -> 85% (ML) | 95% | Predicted direction vs actual (30-day) |
| NPS | 40+ | 50+ | Quarterly survey |
| MAU (Monthly Active Users) | 50K (month 12) | N/A | Unique users with >= 1 search |
| Booking conversion rate | 3-5% | 5-8% | Bookings / unique searchers |
| CFAR claim rate | 5-10% | ~8% | Claims / policies sold |
| Price Freeze usage rate | 40%+ | 50%+ | Freezes converted to bookings / total freezes |
| CAC (Customer Acquisition Cost) | < 500 RUB | N/A | Marketing spend / new users |
| LTV (Lifetime Value) | > 2500 RUB | N/A | Average revenue per user over 12 months |

## 3 Customer Segments

### Segment 1: "Budget-Anxious Millennial" (45% of user base)

- **Demographics:** 25-35 years, income 80K-150K RUB/month, Moscow/SPb/million-plus cities
- **JTBD:** "When I plan a trip on a limited budget, I want to know EXACTLY when to buy a ticket so I don't overpay"
- **Current tools:** Aviasales + manual monitoring + dozens of tabs
- **Trigger:** Saw a price of 25,000 RUB on a flight that was 18,000 RUB yesterday -> FOMO + panic
- **HopperRU value:** Price prediction ("Wait 3 days"), Price Freeze (lock the price now)
- **Preferred channel:** Web + Telegram notifications
- **Revenue potential:** High fintech attach (anxiety = willingness to pay for certainty)

### Segment 2: "Flexible Gen Z Traveler" (30% of user base)

- **Demographics:** 18-25 years, income < 60K RUB/month, mobile-first, Telegram-native
- **JTBD:** "I want to book a trip with friends in 5 minutes on Telegram and be able to cancel for free"
- **Current tools:** Aviasales + TikTok travel hacks
- **Trigger:** Friend shared a deal in group chat, spontaneous trip idea
- **Stats:** 87% purchase from smartphone, 55% book travel on mobile, 66% changed/cancelled plans last year
- **HopperRU value:** Telegram-first booking, CFAR (cancel freely when plans change)
- **Preferred channel:** Telegram bot exclusively
- **Revenue potential:** High CFAR attach rate (plans change frequently)

### Segment 3: "B2B Partner -- Bank/Fintech" (25% of revenue, Phase 2)

- **Who:** Product managers at Tinkoff, Sber, Alfa-Bank, fintech startups
- **JTBD:** "When our bank wants to increase card engagement, I want to embed travel booking in our app without building from scratch"
- **HopperRU value:** White-label SDK (Hopper Technology Solutions model)
- **Revenue model:** Per-transaction fee + revenue share on fintech products
- **Timeline:** Phase 2, after core product validation with B2C segments
