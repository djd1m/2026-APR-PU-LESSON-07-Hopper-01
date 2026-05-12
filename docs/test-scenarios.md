# BDD Test Scenarios: HopperRU

**Дата:** 2026-05-12 | **Generator:** requirements-validator | **Format:** Gherkin

---

## Summary

| Category | Scenarios | Coverage |
|----------|:---------:|---------|
| Happy Path | 12 | Core user journeys |
| Error Handling | 10 | Payment, API, validation failures |
| Edge Cases | 8 | Concurrent access, expiry, limits |
| Security | 5 | Auth, injection, rate limiting |
| **Total** | **35** | |

---

## 1. Happy Path Scenarios

### HP-01: Complete Search → Predict → Freeze → Book → Protect Flow

```gherkin
Feature: End-to-End Booking with Fintech Protection
  As a budget-conscious traveler
  I want to search, get a prediction, freeze the price, book, and add protection
  So that I save money and travel without financial risk

  Scenario: Full journey from search to protected booking
    Given I am a registered user with Telegram account
    When I search for "Москва → Сочи" on "2026-07-15"
    Then I see flight results within 3 seconds

    When the AI predicts "Wait 3 days — save ₽2,500"
    And I click "Заморозить цену"
    And I pay ₽2,500 for Price Freeze
    Then the current price of ₽8,500 is locked for 21 days

    When I return after 3 days
    And the market price is now ₽11,000
    And I click "Забронировать по замороженной цене"
    Then I book at ₽8,500 (saved ₽2,500)

    When I add "Cancel For Any Reason" for ₽1,500
    And I add "Price Drop Protection" for ₽1,200
    And I complete payment via YooKassa (MIR)
    Then I receive booking confirmation + e-ticket via Telegram
    And my total protection cost is ₽5,200
    And my total savings are ₽2,500 - ₽2,500 (freeze fee) = ₽0 net on freeze
    But I have full refund + price drop protection worth ₽8,500+
```

### HP-02: Telegram Bot Quick Search

```gherkin
Feature: Telegram Bot Search
  Scenario: Search via natural language in Telegram
    Given I open HopperRU bot in Telegram
    When I type "Москва Стамбул июль"
    Then the bot parses: origin=MOW, destination=IST, month=July 2026
    And shows top-3 cheapest dates with prices
    And shows AI prediction for each date
    And shows "Подробнее" button for each option
```

### HP-03: Price Alert → Notification → Booking

```gherkin
Feature: Price Alert Workflow
  Scenario: Alert triggers and user books
    Given I set alert for "MOW-AER" target ₽9,000
    When price drops to ₽8,500
    Then I receive Telegram notification within 15 minutes
    And message contains: "✈️ MOW→AER ₽8,500 (↓₽3,500!) Забронировать →"
    When I tap "Забронировать"
    Then I am taken to booking flow with pre-filled details
```

### HP-04: Cancel For Any Reason Claim

```gherkin
Feature: CFAR Refund
  Scenario: Successful CFAR cancellation
    Given I have booking #B-1234 for ₽8,500 with CFAR protection
    And departure is in 5 days
    When I request cancellation
    Then I see "Полный возврат ₽8,500 в течение 5 рабочих дней"
    When I confirm cancellation
    Then refund is initiated to original payment method
    And CFAR status changes to "Использовано"
    And booking status changes to "Отменён (CFAR)"
```

### HP-05: Price Drop Protection Refund

```gherkin
Feature: Price Drop Auto-Refund
  Scenario: Price drops after booking
    Given I booked "MOW-LED" for ₽5,500 with Price Drop Protection
    And today is day 4 of 10-day monitoring period
    When the price drops to ₽4,200
    Then system auto-detects ₽1,300 difference
    And initiates refund of ₽1,300 to my account
    And I receive Telegram notification "Цена упала! Вам возвращено ₽1,300"
```

### HP-06: Referral Flow

```gherkin
Feature: Referral
  Scenario: Successful referral with credit
    Given I have a referral link "hopperru.com/ref/USR123"
    When my friend registers via this link
    And completes first booking
    Then I receive ₽2,000 Carrot Cash credit
    And my friend receives ₽2,000 Carrot Cash credit
    And both receive Telegram notification
```

### HP-07: Savings Dashboard

```gherkin
Feature: Savings Dashboard
  Scenario: View cumulative savings
    Given I have completed 3 bookings with predictions
    When I open "Мои экономии"
    Then I see total savings: ₽8,700
    And savings breakdown per trip
    And "Поделиться" button for Telegram
```

### HP-08: Registration via Telegram

```gherkin
Feature: Telegram OAuth
  Scenario: First-time user registration
    Given I open HopperRU bot
    When I tap "Начать"
    And authorize Telegram login
    Then account is created with Telegram ID, name, and avatar
    And I see welcome message with "Найти рейс" button
```

### HP-09: Price Calendar Navigation

```gherkin
Feature: Price Calendar
  Scenario: Find cheapest date via calendar
    Given I search "Москва → Тбилиси"
    When I open "Календарь цен"
    Then I see current + 2 months
    And green dates (cheapest 20%) are clearly marked
    When I tap on July 8 (green, ₽12,500)
    Then I see full search results for July 8
```

### HP-10: Protection Bundle Checkout

```gherkin
Feature: Fintech Bundle
  Scenario: Add protection bundle at checkout
    Given I am on checkout for "MOW-AER" ₽8,500
    When I see protection options:
      | Product | Individual | Bundle |
      | CFAR | ₽2,000 | |
      | Price Drop | ₽1,500 | |
      | Bundle (both) | | ₽2,800 (-19%) |
    And I select "Bundle"
    Then total becomes ₽8,500 + ₽2,800 = ₽11,300
    And both protections are activated
```

### HP-11: B2B White-Label Demo (v2.0)

```gherkin
Feature: B2B Sandbox
  Scenario: Bank partner views branded demo
    Given I am a bank representative
    When I enter company name and brand colors
    Then I see travel portal with my bank's branding
    And fintech products are available
    And I can simulate a booking flow
```

### HP-12: Multi-Route Watch List

```gherkin
Feature: Watch List
  Scenario: Monitor multiple routes
    Given I have 3 routes in my Watch List
    When I open "Мои маршруты"
    Then I see status for each:
      | Route | Status | Price Change |
      | MOW-IST | 🟢 BUY NOW | ↓ ₽3,200 |
      | MOW-TBS | 🟡 WAIT 5d | → ₽0 |
      | LED-DXB | 🔴 RISING | ↑ ₽5,000 |
```

---

## 2. Error Handling Scenarios

### ERR-01: Payment Failure with Retry

```gherkin
Feature: Payment Error Recovery
  Scenario: Card declined, user retries with SBP
    Given I am on payment step for ₽8,500
    When MIR card payment fails
    Then I see "Оплата не прошла. Попробуйте другой способ."
    And flight remains reserved for 15 minutes
    When I switch to SBP (QR code)
    And scan the QR code
    Then payment succeeds and booking is confirmed
```

### ERR-02: Price Changed During Checkout

```gherkin
Feature: Price Change During Booking
  Scenario: Price increases while user is on checkout
    Given I selected flight at ₽8,500
    When I spend 10 minutes filling passenger details
    And the price changes to ₽9,200 during this time
    Then I see "Цена изменилась: ₽8,500 → ₽9,200"
    And I can accept new price or return to search
    And if I have Price Freeze active, original price is honored
```

### ERR-03: Airline API Timeout

```gherkin
Feature: External API Failure
  Scenario: Airline API does not respond
    Given I search for "MOW-AER"
    When the airline API takes > 10 seconds
    Then I see partial results from available airlines
    And a notice "Некоторые авиакомпании недоступны. Попробуйте позже."
    And retry happens automatically after 30 seconds
```

### ERR-04: Price Freeze Expiry

```gherkin
Feature: Price Freeze Expiration
  Scenario: Freeze expires without booking
    Given I froze price ₽8,500 on "MOW-AER" 21 days ago
    When the freeze period expires
    Then freeze status changes to "Истёк"
    And I receive notification "Ваша заморозка цены истекла. Текущая цена: ₽11,200"
    And freeze fee ₽2,500 is NOT refunded (as per terms)
```

### ERR-05: Duplicate Booking Prevention

```gherkin
Feature: Duplicate Prevention
  Scenario: User double-clicks booking button
    Given I click "Забронировать" for flight SU-1234
    When I accidentally click again within 2 seconds
    Then only one booking is created
    And only one payment is charged
    And I see booking confirmation (not duplicate error)
```

### ERR-06: Invalid Passenger Data

```gherkin
Feature: Passenger Validation
  Scenario: Passport number format is incorrect
    Given I enter passenger name "Иванов Иван"
    And passport number "ABC123" (invalid format)
    When I submit the form
    Then I see inline error "Номер паспорта: 10 цифр (серия + номер)"
    And the field is highlighted in red
    And I cannot proceed until corrected
```

### ERR-07: Exceeded Alert Limit

```gherkin
Feature: Alert Limit
  Scenario: User tries to create 11th alert
    Given I have 10 active price alerts
    When I try to add an 11th alert
    Then I see "Достигнут лимит (10 уведомлений). Удалите неактуальное."
    And I see my active alerts list with delete option
```

### ERR-08: Search with Past Date

```gherkin
Feature: Date Validation
  Scenario: User enters a past departure date
    Given today is "2026-05-12"
    When I enter departure date "2026-05-10"
    Then I see "Выберите будущую дату"
    And the calendar does not allow selecting past dates
```

### ERR-09: Network Disconnection During Booking

```gherkin
Feature: Network Resilience
  Scenario: Connection drops mid-booking
    Given I am on payment confirmation step
    When network connection is lost
    Then I see "Потеряно соединение. Проверяем статус бронирования..."
    When connection is restored
    Then system checks booking status
    And if payment went through → show confirmation
    And if payment did not go through → allow retry
```

### ERR-10: Insurance Partner Unavailable

```gherkin
Feature: Fintech Degradation
  Scenario: Insurance API is down
    Given I am on checkout
    When insurance partner API is unavailable
    Then Price Freeze and Price Drop Protection are still available (in-house)
    But CFAR shows "Временно недоступно"
    And I can complete booking without CFAR
```

---

## 3. Edge Case Scenarios

### EDGE-01: Concurrent Price Freeze on Same Flight

```gherkin
Feature: Concurrent Freezes
  Scenario: Two users freeze same flight simultaneously
    Given User A and User B both view "MOW-AER" at ₽8,500
    When both click "Заморозить" within 1 second
    Then both should get Price Freeze confirmed
    And each freeze is independent (both valid)
    And total airline inventory is not affected (freeze is our financial product)
```

### EDGE-02: Price Prediction for New Route

```gherkin
Feature: Cold Start Route
  Scenario: Route with <30 days of data
    Given route "MOW-VVO" was added to system yesterday
    When user searches this route
    Then prediction shows "Недостаточно данных" (gray badge)
    And historical price graph is empty
    And user can still book and use fintech products
```

### EDGE-03: Booking Right Before Departure

```gherkin
Feature: Last-Minute Booking
  Scenario: Booking 2 hours before departure
    Given departure is in 2 hours
    When user attempts to book
    Then booking is allowed (airline decides availability)
    But CFAR is NOT available (24h before departure cutoff)
    And Price Freeze is NOT available (departure too close)
    And warning: "Вылет через 2 часа. Финансовая защита недоступна."
```

### EDGE-04: Massive Price Swing

```gherkin
Feature: Extreme Price Change
  Scenario: Price doubles overnight
    Given user has Price Freeze at ₽8,500
    And market price jumps to ₽17,000
    When user books at frozen price ₽8,500
    Then booking is processed at ₽8,500
    And system absorbs ₽8,500 loss on this freeze
    And risk management is notified for hedge evaluation
```

### EDGE-05: Currency/Locale Edge Cases

```gherkin
Feature: Locale Handling
  Scenario: Price display in different locales
    Given user's locale is "ru-RU"
    Then prices display as "8 500 ₽" (space as thousands separator)
    And dates display as "15 июля 2026"
    And time displays in 24-hour format
```

### EDGE-06: Rate Limiting

```gherkin
Feature: API Rate Limiting
  Scenario: Bot abuse detection
    Given a Telegram account sends 100 searches in 1 minute
    When the 101st request arrives
    Then return "Слишком много запросов. Подождите 60 секунд."
    And log the incident for review
    And legitimate users are not affected
```

### EDGE-07: Leap Year / Timezone Edge Cases

```gherkin
Feature: Date Edge Cases
  Scenario: Flight crossing midnight and timezones
    Given a flight departs MOW at 23:45 on Feb 28
    And arrives IST at 02:30 on Mar 1
    When displaying in user's timezone (Moscow, UTC+3)
    Then departure shows "28 фев, 23:45"
    And arrival shows "1 мар, 02:30 (следующий день)"
```

### EDGE-08: Full Flight During Freeze Period

```gherkin
Feature: Sold Out During Freeze
  Scenario: Flight sells out while price is frozen
    Given I have an active Price Freeze on flight SU-1234
    When the flight sells out during freeze period
    Then system notifies me: "Рейс распродан. Заморозка отменена."
    And freeze fee is refunded in full
    And alternative flights are suggested
```

---

## 4. Security Scenarios

### SEC-01: SQL Injection in Search

```gherkin
Feature: SQL Injection Prevention
  Scenario: Malicious search input
    Given I enter origin "MOW'; DROP TABLE users;--"
    When the search is submitted
    Then input is sanitized
    And search returns "Аэропорт не найден"
    And no database damage occurs
```

### SEC-02: Unauthorized Access to Other User's Booking

```gherkin
Feature: Authorization Check
  Scenario: User tries to view another user's booking
    Given User A has booking #B-1234
    When User B requests GET /api/bookings/B-1234
    Then response is 403 Forbidden
    And no booking data is exposed
```

### SEC-03: JWT Token Expiration

```gherkin
Feature: Token Security
  Scenario: Expired JWT token
    Given my JWT token expired 5 minutes ago
    When I make an API request
    Then I receive 401 Unauthorized
    And I am prompted to re-authenticate via Telegram
    And my session state is preserved after re-auth
```

### SEC-04: Personal Data Handling (152-ФЗ)

```gherkin
Feature: Data Privacy Compliance
  Scenario: User requests data export
    Given I am a registered user
    When I request "Экспорт моих данных" in settings
    Then system generates JSON/CSV with all my personal data
    And data is available for download within 24 hours
    And all data is stored on Russian servers (Selectel/Yandex Cloud)
```

### SEC-05: Rate-Limited Authentication

```gherkin
Feature: Brute Force Protection
  Scenario: Multiple failed login attempts
    Given someone attempts 5 failed logins for my phone number
    When the 6th attempt occurs
    Then account is temporarily locked for 30 minutes
    And I receive Telegram notification about suspicious activity
    And IP is logged for security review
```
