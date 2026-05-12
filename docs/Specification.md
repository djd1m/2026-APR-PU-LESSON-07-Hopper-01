# Specification: HopperRU
**Версия:** 1.0 | **Дата:** 2026-05-12 | **Формат:** SPARC Specification (Gherkin + NFR)

---

## 1. Epic Overview

| Epic | Описание | Phase | Stories |
|------|----------|:-----:|:-------:|
| E1 | Price Search & Prediction | MVP | US-01 .. US-04 |
| E2 | Booking | MVP | US-05 .. US-07 |
| E3 | Fintech Protection | MVP + v1.0 | US-08 .. US-12 |
| E4 | Telegram Bot | MVP | US-13 .. US-16 |
| E5 | User Account & History | MVP | US-17 .. US-20 |

---

## 2. User Stories (Gherkin Format)

### Epic 1: Price Search & Prediction

#### US-01: Search Flights by Route and Dates

```gherkin
Feature: Flight Search
  As a user
  I want to search for flights by origin, destination, and dates
  So that I can see available options and prices

  Scenario: Successful domestic flight search
    Given I am an authenticated user
    And I enter origin "Москва (SVO)" and destination "Сочи (AER)"
    And I select departure date "2026-07-15" and return date "2026-07-22"
    When I submit the search
    Then I should see a list of available flights sorted by price
    And each result should display airline, departure/arrival time, duration, and price
    And results should load within 3 seconds

  Scenario: No flights found
    Given I enter origin "Москва (SVO)" and destination "Норильск (NSK)"
    And I select departure date "2026-12-31"
    When I submit the search
    And no flights match the criteria
    Then I should see a message "Рейсов не найдено. Попробуйте другие даты."
    And I should see alternative date suggestions

  Scenario: Search with flexible dates
    Given I enter origin and destination
    And I check "Гибкие даты (+/- 3 дня)"
    When I submit the search
    Then I should see results for a 7-day window around my selected dates
    And the cheapest option should be highlighted
```

**Acceptance Criteria:**
- Search supports top-20 domestic RU routes (MVP)
- Response time < 3 seconds (P95)
- Results include all major carriers (Аэрофлот, S7, Победа, Уральские, Россия)
- Prices displayed in RUB, inclusive of all fees

#### US-02: AI Price Prediction (Buy Now / Wait)

```gherkin
Feature: Price Prediction
  As a user
  I want to see an AI recommendation whether to buy now or wait
  So that I can make an informed purchase decision and save money

  Scenario: AI recommends "Buy Now"
    Given I am viewing search results for "MOW-LED" on "2026-08-01"
    And the current price is 5,500 RUB
    When the prediction engine analyzes the route
    And the probability of price increase is > 70%
    Then I should see a green badge "Купить сейчас"
    And I should see the explanation "Цена с вероятностью 75% вырастет в ближайшие 5 дней"
    And I should see the confidence level of the prediction

  Scenario: AI recommends "Wait"
    Given I am viewing search results for "MOW-AER" on "2026-07-15"
    And the current price is 12,000 RUB
    When the prediction engine analyzes the route
    And the probability of price decrease is > 60%
    Then I should see a yellow badge "Подождать ~3 дня"
    And I should see "Ожидаемая экономия: ~₽2,500"
    And I should see an option to set a price alert

  Scenario: Prediction confidence too low
    Given I am viewing search results for a low-traffic route
    When the prediction engine has insufficient data (confidence < 50%)
    Then I should see a gray badge "Недостаточно данных"
    And I should NOT see a specific recommendation
    And I should see historical price trend graph
```

**Acceptance Criteria:**
- Prediction accuracy >= 70% (Phase 1 rule-based)
- Every prediction shows confidence level and explanation
- Predictions available for top-20 domestic routes
- Prediction recalculates every 6 hours

#### US-03: Color-Coded Price Calendar

```gherkin
Feature: Price Calendar
  As a user
  I want to see a color-coded calendar showing cheapest and most expensive travel dates
  So that I can choose the optimal departure date

  Scenario: View price calendar for a route
    Given I have searched "Москва -> Стамбул"
    When I click "Календарь цен"
    Then I should see a monthly calendar view
    And each day should be color-coded:
      | Color  | Meaning                        |
      | Green  | Cheapest 20% of dates          |
      | Yellow | Average price                  |
      | Red    | Most expensive 20% of dates    |
    And each day should show the lowest price for that date
    And I should be able to navigate between months

  Scenario: Select date from calendar
    Given I am viewing the price calendar
    When I tap on a specific date
    Then I should see full search results for that date
    And the price prediction for that date
```

**Acceptance Criteria:**
- Calendar loads within 2 seconds
- Shows 3 months of data (current + 2 forward)
- Color coding based on relative price distribution for the route
- Available in both Telegram Mini App and Web App

#### US-04: Price Alert Subscription

```gherkin
Feature: Price Alerts
  As a user
  I want to subscribe to price alerts for a specific route
  So that I get notified when the price drops to my target

  Scenario: Set a price alert
    Given I am viewing results for "MOW-AER" on "2026-07-15"
    And the current price is 12,000 RUB
    When I set a target price of 9,000 RUB
    Then I should see confirmation "Уведомление установлено"
    And I should be notified via Telegram when price <= 9,000 RUB

  Scenario: Price drops below target
    Given I have an active alert for "MOW-AER" with target 9,000 RUB
    When the price drops to 8,500 RUB
    Then I should receive a Telegram message within 15 minutes
    And the message should contain current price, savings amount, and a booking link

  Scenario: Alert expires
    Given I have an active alert
    When the departure date passes without the target being reached
    Then the alert should be automatically deactivated
    And I should receive a final notification with the lowest observed price
```

**Acceptance Criteria:**
- Max 10 active alerts per user
- Notification delivery within 15 minutes of price change
- Alert auto-expires on departure date
- Price check frequency: every 30 minutes for active alerts

---

### Epic 2: Booking

#### US-05: Book a Flight

```gherkin
Feature: Flight Booking
  As a user
  I want to book a flight directly through HopperRU
  So that I can complete my purchase without leaving the platform

  Scenario: Successful booking
    Given I have selected a flight "Аэрофлот SU-1234 MOW-AER" for 8,500 RUB
    And I have entered passenger details (name, passport, email, phone)
    When I confirm the booking
    And payment is processed successfully via YooKassa
    Then I should receive a booking confirmation with PNR code
    And I should receive an e-ticket via email and Telegram
    And the booking should appear in my history

  Scenario: Payment failure
    Given I have selected a flight and entered details
    When payment fails (insufficient funds, card declined)
    Then I should see error message "Оплата не прошла. Попробуйте другой способ оплаты."
    And my selected flight should remain reserved for 15 minutes
    And I should see alternative payment options (MIR, SBP, Telegram Payments)

  Scenario: Flight no longer available
    Given I have selected a flight
    When I attempt to book and the seat is no longer available
    Then I should see "Рейс распродан. Найдены похожие варианты:"
    And I should see alternative flights on the same route
```

**Acceptance Criteria:**
- Supports MIR cards, SBP (QR), Telegram Payments
- Booking confirmation within 30 seconds
- PNR delivered via email AND Telegram
- 152-ФЗ compliant passenger data handling

#### US-06: Manage Booking

```gherkin
Feature: Booking Management
  As a user
  I want to view and manage my bookings
  So that I can track my travel plans

  Scenario: View active bookings
    Given I have 2 active bookings
    When I open "Мои бронирования"
    Then I should see a list of bookings with status, dates, route, and price
    And upcoming bookings should be sorted by departure date

  Scenario: View booking details
    Given I have a booking for "MOW-AER" on "2026-07-15"
    When I tap on the booking
    Then I should see full details: PNR, flight info, passenger info, payment info
    And I should see active protection products (Price Freeze, CFAR)
    And I should see e-ticket download option
```

**Acceptance Criteria:**
- Booking history retained for 2 years
- Real-time status updates (confirmed, checked-in, completed, cancelled)
- Accessible from both Telegram Bot and Web App

#### US-07: Cancel Booking

```gherkin
Feature: Booking Cancellation
  As a user
  I want to cancel my booking
  So that I can change my travel plans

  Scenario: Cancel with CFAR protection
    Given I have a booking with Cancel For Any Reason protection
    And the departure is more than 24 hours away
    When I request cancellation
    Then I should see "Полный возврат: ₽8,500 на ваш счёт в течение 5 рабочих дней"
    And the refund should be initiated automatically
    And the CFAR protection should be marked as "Использовано"

  Scenario: Cancel without protection (standard airline policy)
    Given I have a booking WITHOUT CFAR protection
    When I request cancellation
    Then I should see the airline's cancellation policy
    And I should see the estimated refund amount (may be partial or zero)
    And I should see "С защитой 'Отмена по любой причине' возврат был бы 100%"
```

**Acceptance Criteria:**
- CFAR refund processed within 5 business days
- Standard cancellation follows airline policy
- Cancellation reason recorded for analytics
- Upsell CFAR on non-protected bookings

---

### Epic 3: Fintech Protection

#### US-08: Purchase Price Freeze

```gherkin
Feature: Price Freeze
  As a user
  I want to freeze the current flight price for up to 21 days
  So that I can decide later without risking a price increase

  Scenario: Freeze a price
    Given I am viewing a flight "MOW-AER" at 8,500 RUB
    When I tap "Заморозить цену"
    And I pay the freeze fee of 2,500 RUB via YooKassa
    Then the price 8,500 RUB should be locked for 21 days
    And I should see a countdown timer
    And I should receive confirmation in Telegram

  Scenario: Book at frozen price (price went up)
    Given I have a frozen price of 8,500 RUB
    And the current market price is 11,000 RUB
    When I click "Забронировать по замороженной цене"
    Then I should pay 8,500 RUB (not 11,000 RUB)
    And the freeze should be marked as "Использовано"

  Scenario: Book at lower price (price went down)
    Given I have a frozen price of 8,500 RUB
    And the current market price is 7,000 RUB
    When I click "Забронировать"
    Then I should pay 7,000 RUB (the lower price)
    And the freeze should be marked as "Использовано"

  Scenario: Freeze expires
    Given I have a frozen price
    When 21 days pass without booking
    Then the freeze should expire
    And the freeze fee is NOT refunded
    And I should receive a notification "Заморозка истекла"
```

**Acceptance Criteria:**
- Freeze fee: ₽2,000-3,000 (depends on route volatility)
- Freeze duration: up to 21 days
- User always gets the LOWER of frozen vs current price
- Max 3 active freezes per user
- Freeze fee is non-refundable

#### US-09: Purchase Cancel For Any Reason (v1.0)

```gherkin
Feature: Cancel For Any Reason
  As a user
  I want to buy CFAR protection for my booking
  So that I can get a full refund if I cancel for any reason

  Scenario: Add CFAR to booking
    Given I am completing a booking for 12,000 RUB
    When I see the CFAR offer "Отмена по любой причине — ₽2,000"
    And I add CFAR to my order
    Then my total should be 14,000 RUB (12,000 + 2,000)
    And CFAR terms should be clearly displayed
    And the insurance partner name should be visible

  Scenario: Use CFAR protection
    Given I have a booking with CFAR protection
    And the departure is > 24 hours away
    When I cancel the booking
    Then I should receive full refund of the booking amount (12,000 RUB)
    And the CFAR fee (2,000 RUB) is NOT refunded
    And refund should arrive within 5 business days

  Scenario: CFAR expired (post-departure)
    Given I have a booking with CFAR
    And the flight has already departed
    When I try to cancel
    Then I should see "Защита 'Отмена по любой причине' действует только до вылета"
```

**Acceptance Criteria:**
- CFAR provided through licensed insurance partner
- CFAR premium: 10-20% of booking price (₽1,500-2,500 typical)
- Refund to original payment method within 5 business days
- Clear disclosure of insurance partner and terms (regulatory requirement)
- Available from v1.0 (requires insurance partnership)

#### US-10: Purchase Price Drop Protection (v1.0)

```gherkin
Feature: Price Drop Protection
  As a user
  I want to buy price drop protection for my booking
  So that I get the difference back if the price drops after I book

  Scenario: Add Price Drop Protection
    Given I am completing a booking for 10,000 RUB
    When I see "Защита от снижения цены — ₽1,500 (мониторинг 10 дней)"
    And I add it to my order
    Then my total should be 11,500 RUB
    And I should see the monitoring period (10 days)

  Scenario: Price drops during monitoring
    Given I have Price Drop Protection on a 10,000 RUB booking
    And the price drops to 8,000 RUB on day 5
    Then I should receive a Telegram notification "Цена упала! Вам начислен возврат ₽2,000"
    And 2,000 RUB should be refunded to my account within 3 business days

  Scenario: Price does not drop
    Given I have Price Drop Protection
    And 10 days pass without a price decrease
    Then the protection expires
    And I should receive "Мониторинг завершён. Цена не снижалась — вы купили по лучшей цене!"
```

**Acceptance Criteria:**
- Monitoring period: 10 days from booking
- Price checked every 30 minutes
- Refund = difference between booked price and lowest observed price
- Max refund = 50% of booking price
- Automatic payout, no claim process needed

#### US-11: Fintech Bundle Upsell

```gherkin
Feature: Protection Bundle
  As a user
  I want to see a combined protection offer during checkout
  So that I can protect my trip comprehensively at a discount

  Scenario: Bundle offer at checkout
    Given I am booking a flight for 15,000 RUB
    When I reach the checkout page
    Then I should see individual protection options:
      | Product               | Price    |
      | Price Drop Protection | ₽1,500   |
      | Cancel For Any Reason | ₽2,500   |
    And I should see a bundle offer "Полная защита — ₽3,200 (экономия ₽800)"
    And the bundle should be pre-selected by default

  Scenario: Decline all protection
    Given I am at checkout with bundle pre-selected
    When I deselect all protection options
    Then I should see a soft warning "Без защиты вы рискуете потерять ₽15,000 при отмене"
    And I should be able to proceed without protection
```

**Acceptance Criteria:**
- Bundle discount: 15-20% vs individual products
- Bundle pre-selected (opt-out, not opt-in)
- Target attach rate: 15% (M6), 25% (M12)
- No dark patterns: clear deselect option

#### US-12: Flight Disruption Guarantee (v2.0)

```gherkin
Feature: Flight Disruption Guarantee
  As a user
  I want automatic rebooking if my flight is delayed 2+ hours
  So that I don't have to deal with disruption logistics

  Scenario: Flight delayed, auto-rebook offered
    Given I have a booking with Disruption Guarantee
    And my flight is delayed by 3 hours
    When the system detects the delay via flight status API
    Then I should receive a Telegram message with rebooking options
    And I should be able to select an alternative flight with one tap
    And the rebooking should be free
```

**Acceptance Criteria:**
- Trigger: delay >= 2 hours or cancellation
- Rebooking within same airline alliance when possible
- Available from v2.0 (requires insurance partnership + flight status API)

---

### Epic 4: Telegram Bot

#### US-13: Search via Telegram Bot

```gherkin
Feature: Telegram Bot Search
  As a Telegram user
  I want to search for flights by sending a text message
  So that I can find flights without leaving Telegram

  Scenario: Natural language search
    Given I am chatting with @HopperRU_bot
    When I send "Москва Сочи июль"
    Then the bot should parse origin, destination, and month
    And respond with top-5 cheapest dates in July
    And each option should include price, prediction badge, and a "Book" button

  Scenario: Structured search via inline keyboard
    Given I send "/search" to the bot
    When the bot presents inline keyboard buttons
    Then I should be able to select origin, destination, and dates step by step
    And see results in a formatted message

  Scenario: Ambiguous query
    Given I send "билеты на юг"
    When the bot cannot determine exact destination
    Then the bot should ask "Куда именно? Выберите:" with popular southern destinations
```

**Acceptance Criteria:**
- Natural language parsing for Russian queries
- Response within 5 seconds
- Top-5 results per query
- Inline keyboard for structured interaction

#### US-14: Price Alerts via Telegram

```gherkin
Feature: Telegram Price Alerts
  As a Telegram user
  I want to receive price change notifications in Telegram
  So that I can act on price drops immediately

  Scenario: Receive price drop alert
    Given I have set a price alert for "MOW-AER" targeting 9,000 RUB
    When the price drops to 8,700 RUB
    Then I should receive a Telegram message:
      """
      ✈️ Цена упала! MOW → AER
      Было: ₽12,000 | Сейчас: ₽8,700
      Экономия: ₽3,300
      [Забронировать] [Заморозить цену]
      """
    And the message should have inline buttons for booking and price freeze
```

**Acceptance Criteria:**
- Alert delivery within 15 minutes of price change
- Rich message formatting with inline buttons
- Deep link to booking flow

#### US-15: Book via Telegram Payments

```gherkin
Feature: Telegram Booking & Payment
  As a Telegram user
  I want to complete booking and payment inside Telegram
  So that I never leave the messenger

  Scenario: Complete booking in Telegram
    Given I selected a flight from search results in Telegram
    When I tap "Забронировать"
    Then the bot should collect passenger details via conversation flow
    And present an invoice via Telegram Payments
    And I should be able to pay with MIR card or SBP

  Scenario: Add protection in Telegram
    Given I am in the booking flow
    When the bot asks "Добавить защиту?"
    Then I should see protection options as inline buttons
    And the total should update when I select/deselect options
```

**Acceptance Criteria:**
- Full booking flow without leaving Telegram
- Telegram Payments integration (YooKassa provider)
- MIR and SBP support
- Conversation-based data collection with validation

#### US-16: Viral Sharing Mechanic

```gherkin
Feature: Share Savings
  As a user who saved money using HopperRU
  I want to share my savings with friends
  So that they can also benefit from the service

  Scenario: Share savings after booking
    Given I completed a booking and saved 3,200 RUB via prediction
    When I see the savings summary
    Then I should see a "Поделиться" button
    And tapping it should generate a Telegram message:
      """
      Сэкономил ₽3,200 на перелёте MOW → AER с @HopperRU_bot!
      AI предсказал лучший момент покупки. Проверь свой рейс: t.me/HopperRU_bot
      """
    And the shared link should contain a referral code
```

**Acceptance Criteria:**
- Shareable message generated automatically post-booking
- Referral tracking via unique codes
- Target: K-factor > 0.1

---

### Epic 5: User Account & History

#### US-17: Registration / Authentication

```gherkin
Feature: User Registration
  As a new user
  I want to create an account via Telegram or email
  So that I can save my bookings and preferences

  Scenario: Register via Telegram
    Given I start a conversation with @HopperRU_bot
    When I send "/start"
    Then the bot should create my account automatically using Telegram user data
    And I should see a welcome message with quick-start instructions
    And my Telegram ID should be linked to my HopperRU account

  Scenario: Register via Web App
    Given I visit hopperru.ru
    When I click "Войти"
    Then I should see options: "Войти через Telegram" and "Email + пароль"
    And Telegram OAuth should link to existing bot account if present

  Scenario: Link Telegram and Web accounts
    Given I registered via Web App with email
    When I start using @HopperRU_bot
    And I send "/link" and enter my email
    Then my Telegram and Web accounts should be merged
    And all bookings should be visible in both interfaces
```

**Acceptance Criteria:**
- Telegram auto-registration (zero-friction)
- Email registration for Web App
- Account linking between Telegram and Web
- 152-ФЗ compliant data storage

#### US-18: View Booking History

```gherkin
Feature: Booking History
  As a user
  I want to view my past and upcoming bookings
  So that I can track my travel history and spending

  Scenario: View booking history
    Given I have completed 5 bookings over 6 months
    When I open "История бронирований"
    Then I should see all bookings grouped by status (Upcoming / Completed / Cancelled)
    And each booking should show: route, dates, price, protection status
    And I should see total savings from predictions and protections

  Scenario: View savings dashboard
    Given I have used HopperRU for 3 months
    When I open "Мои экономии"
    Then I should see:
      | Metric                | Value     |
      | Сэкономлено на прогнозах | ₽12,500  |
      | Возвращено по защитам    | ₽3,200   |
      | Всего сэкономлено       | ₽15,700  |
```

**Acceptance Criteria:**
- History retained for 2 years
- Savings calculations based on actual price movements
- Exportable as PDF (Web App)

#### US-19: User Preferences

```gherkin
Feature: User Preferences
  As a user
  I want to set my travel preferences
  So that I receive personalized recommendations

  Scenario: Set home airport
    Given I open preferences
    When I set "Домашний аэропорт" to "SVO (Москва Шереметьево)"
    Then future searches should default to SVO as origin
    And price alerts should include deals from SVO

  Scenario: Set notification preferences
    Given I open preferences
    When I configure notifications:
      | Type            | Channel  | Frequency |
      | Price Alerts    | Telegram | Real-time |
      | Weekly Digest   | Email    | Weekly    |
      | Promo Offers    | Off      | —         |
    Then my notification settings should be saved
    And future notifications should follow these preferences
```

**Acceptance Criteria:**
- Preferences synced between Telegram and Web App
- Granular notification control
- Default preferences for new users (all ON except promo)

#### US-20: Delete Account (GDPR / 152-ФЗ)

```gherkin
Feature: Account Deletion
  As a user
  I want to delete my account and all personal data
  So that I can exercise my privacy rights under 152-ФЗ

  Scenario: Request account deletion
    Given I am authenticated
    When I request "Удалить аккаунт"
    Then I should see a confirmation dialog with consequences
    And I should confirm with my Telegram code or password
    And all personal data should be deleted within 30 days
    And anonymized booking data should be retained for analytics

  Scenario: Active bookings prevent deletion
    Given I have upcoming active bookings
    When I request account deletion
    Then I should see "У вас есть активные бронирования. Завершите или отмените их перед удалением."
```

**Acceptance Criteria:**
- Full data deletion within 30 days of request (152-ФЗ)
- Active bookings block deletion
- Anonymized analytics data retained
- Confirmation required (no accidental deletion)

---

## 3. Feature Matrix (MVP / v1.0 / v2.0)

| Feature | MVP (M1-3) | v1.0 (M4-9) | v2.0 (M12-24) |
|---------|:----------:|:-----------:|:-------------:|
| **E1: Search & Prediction** | | | |
| Flight search (top-20 domestic) | ✅ | ✅ | ✅ |
| AI prediction (rule-based 70%) | ✅ | ML 85% | ML 95% |
| Color-coded calendar | ✅ | ✅ | ✅ |
| Price alerts | ✅ | ✅ | ✅ |
| Hotel search | -- | ✅ | ✅ |
| Train search (РЖД) | -- | ✅ | ✅ |
| International flights | -- | -- | ✅ |
| **E2: Booking** | | | |
| Flight booking | ✅ | ✅ | ✅ |
| Booking management | ✅ | ✅ | ✅ |
| Hotel booking | -- | ✅ | ✅ |
| Train booking | -- | ✅ | ✅ |
| **E3: Fintech Protection** | | | |
| Price Freeze | ✅ | ✅ | ✅ |
| Cancel For Any Reason | -- | ✅ | ✅ |
| Price Drop Protection | -- | ✅ | ✅ |
| Flight Disruption Guarantee | -- | -- | ✅ |
| Protection Bundle | -- | ✅ | ✅ |
| **E4: Telegram Bot** | | | |
| Text search | ✅ | ✅ | ✅ |
| Inline keyboards | ✅ | ✅ | ✅ |
| Telegram Payments | ✅ | ✅ | ✅ |
| Price alerts in Telegram | ✅ | ✅ | ✅ |
| Viral sharing | ✅ | ✅ | ✅ |
| Telegram Mini App | -- | ✅ | ✅ |
| **E5: Account** | | | |
| Telegram auto-registration | ✅ | ✅ | ✅ |
| Web registration | ✅ | ✅ | ✅ |
| Booking history | ✅ | ✅ | ✅ |
| Savings dashboard | -- | ✅ | ✅ |
| Account deletion (152-ФЗ) | ✅ | ✅ | ✅ |
| Carrot Cash (кэшбэк) | -- | ✅ | ✅ |
| **Infrastructure** | | | |
| MIR / SBP payments | ✅ | ✅ | ✅ |
| Digital Ruble | -- | -- | ✅ |
| B2B White-Label API | -- | -- | ✅ |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Requirement | Measurement |
|--------|-------------|-------------|
| Search response time | < 3 seconds (P95) | API response time from request to results |
| Prediction calculation | < 200ms (P95) | Time to generate prediction for a single route |
| Page load (Web App) | < 2 seconds (P95) | First Contentful Paint |
| Telegram bot response | < 5 seconds (P95) | Time from user message to bot reply |
| Booking confirmation | < 30 seconds | End-to-end from payment to PNR |
| Price alert delivery | < 15 minutes | From price change detection to user notification |

### 4.2 Scalability

| Metric | MVP | v1.0 | v2.0 |
|--------|:---:|:----:|:----:|
| Concurrent users | 1K | 10K | 100K |
| Searches per day | 10K | 100K | 1M |
| Active bookings | 500 | 5K | 50K |
| Active price alerts | 2K | 20K | 200K |
| Price checks per hour | 50K | 500K | 5M |

### 4.3 Security & Compliance

| Requirement | Standard | Priority |
|-------------|----------|:--------:|
| Data residency | Серверы в РФ (152-ФЗ) | P0 |
| Personal data encryption | AES-256 at rest, TLS 1.3 in transit | P0 |
| Payment data | PCI DSS Level 3 (via YooKassa) | P0 |
| Passport data storage | Encrypted, access-logged, auto-deleted after trip | P0 |
| Account deletion | Within 30 days of request (152-ФЗ) | P0 |
| API authentication | JWT + refresh tokens, rate limiting | P0 |
| Telegram bot security | Webhook signature verification | P0 |
| Audit logging | All data access logged with user ID and timestamp | P1 |
| RBAC | Role-based access for admin panel | P1 |
| Penetration testing | Annual, before v1.0 launch | P1 |

### 4.4 Availability & Reliability

| Metric | Target |
|--------|--------|
| Uptime SLA | 99.5% (MVP), 99.9% (v2.0) |
| RTO (Recovery Time Objective) | < 1 hour |
| RPO (Recovery Point Objective) | < 15 minutes |
| Database backup | Daily full + hourly incremental |
| Disaster recovery | Cross-datacenter replication (v2.0) |

### 4.5 Observability

| Component | Tool | Priority |
|-----------|------|:--------:|
| Application logs | Structured JSON, centralized aggregation | P0 |
| Metrics (business) | Booking count, conversion, attach rate, MRR | P0 |
| Metrics (infra) | CPU, memory, disk, network per container | P0 |
| Alerting | Telegram notifications to ops channel | P0 |
| Error tracking | Sentry or equivalent | P0 |
| Distributed tracing | OpenTelemetry (v1.0) | P1 |
| Dashboards | Grafana or equivalent | P1 |

### 4.6 Localization

| Aspect | Requirement |
|--------|-------------|
| Language | Russian (primary), English (secondary, v2.0) |
| Currency | RUB (primary), USD (display only for international, v2.0) |
| Timezone | Moscow Time (default), user-configurable |
| Date format | DD.MM.YYYY (Russian standard) |
| Phone format | +7 (XXX) XXX-XX-XX |

---

## 5. Architecture Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Pattern | Distributed Monolith (Monorepo) | Simplicity on MVP, modular scaling |
| Containers | Docker + Docker Compose | VPS deployment, reproducible builds |
| Infrastructure | VPS (AdminVPS/HOSTKEY), servers in Russia | 152-ФЗ data residency |
| Deploy | Docker Compose direct deploy | No Kubernetes overhead at MVP scale |
| AI Integration | MCP servers | Agentic AI for price prediction and automation |
| Database | PostgreSQL (primary) + Redis (cache) | Proven stack, Russian hosting available |
| Message Queue | Redis Streams (MVP), Kafka (v2.0) | Start simple, scale when needed |
