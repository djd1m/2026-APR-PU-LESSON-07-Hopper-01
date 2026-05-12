# HopperRU -- User Guide

## Contents

1. [Getting Started](#getting-started)
2. [Flight Search](#flight-search)
3. [AI Price Prediction](#ai-price-prediction)
4. [Price Freeze](#price-freeze)
5. [Booking](#booking)
6. [Financial Protection](#financial-protection)
7. [Price Alerts](#price-alerts)
8. [Personal Account](#personal-account)
9. [FAQ](#faq)

---

## Getting Started

### Telegram Bot

The fastest way to start is through the Telegram bot:

1. Open Telegram and find **@HopperRU_bot**
2. Tap **"Start"** (or send `/start`)
3. The bot will ask you to authorize -- confirm your phone number
4. Done! Send `/search` to find your first flight

### Web Application

1. Go to [hopperru.ru](https://hopperru.ru)
2. Click **"Log in via Telegram"**
3. Confirm authorization in Telegram
4. You will be redirected to your personal account with access to all features

---

## Flight Search

### Simple Search

**In Telegram:**

```
/search Moscow Sochi 15.07.2026
```

Or use interactive mode:

1. Send `/search`
2. The bot will ask for the departure city
3. Then the arrival city
4. Then the date (or date range)
5. Receive a list of flights with prices

**In the web application:**

1. On the homepage, fill in the form: from, to, when
2. Select cabin class (economy/business)
3. Specify the number of passengers
4. Click **"Search"**

### Flexible Dates

Not sure about the exact date? Use flexible search:

**In Telegram:**

```
/search Moscow Sochi 10.07-20.07.2026
```

The bot will show the cheapest options within the specified range.

**In the web application:**

Enable the **"Flexible dates (+/- 3 days)"** toggle next to the date field.

### Price Calendar

Want to see prices for an entire month?

**In Telegram:**

```
/calendar Moscow Sochi July 2026
```

**In the web application:**

After searching, click the **"Price Calendar"** tab. You will see a color-coded map:

| Color | Meaning |
|-------|---------|
| Green | Low price (good time to buy) |
| Yellow | Average price |
| Red | High price |
| Gray | No data available |

---

## AI Price Prediction

HopperRU analyzes historical data and current trends to advise: **buy now or wait**.

### How to Read Predictions

After each search, a badge appears next to the price:

| Badge | Meaning | Recommendation |
|-------|---------|----------------|
| **Buy** (green) | Price is at or near its minimum | Buy now -- it is unlikely to get cheaper |
| **Wait** (yellow) | Price is likely to decrease | Wait a few days, set up an alert |
| **Insufficient Data** (gray) | Not enough historical data for a forecast | Decide on your own |

### Prediction Confidence

Below the badge, a **confidence level** is displayed (e.g., "85% confidence"):

- **80-100%** -- high confidence, you can rely on the recommendation
- **60-79%** -- moderate confidence, there is a small risk of error
- **Below 50%** -- the gray "Insufficient Data" badge is shown

### How It Works

1. The system collects prices for thousands of routes daily
2. The AI model analyzes seasonality, day of the week, and flight occupancy
3. Based on patterns, it forecasts whether the price will rise or fall
4. The model continuously learns from new data and improves over time

---

## Price Freeze

### What Is It

Price Freeze is a unique HopperRU feature. You **lock the current price** for up to 21 days. If the price rises during that period, you purchase the ticket at the frozen price. If the price drops, you buy at the new, lower price.

### Freeze Cost

| Parameter | Value |
|-----------|-------|
| Cost | 2,000 - 3,000 RUB (depends on route and duration) |
| Maximum duration | 21 days |
| Refund of freeze fee | Not available (except when the flight is sold out) |

### How to Freeze a Price

**In Telegram:**

1. Find a flight via `/search`
2. Tap the **"Freeze Price"** button below the desired flight
3. Select the freeze duration (7 / 14 / 21 days)
4. Pay the freeze fee via MIR or SBP
5. The price is locked. You will receive a notification 3 days before expiration

**In the web application:**

1. On the search results page, click **"Freeze"** next to the price
2. Select the duration and confirm payment

### What Happens After

- **Price went up** -- you purchase the ticket at the frozen (old) price. Savings!
- **Price went down** -- you purchase the ticket at the new (lower) price. The freeze still pays off with market insight
- **Freeze expired** -- the freeze is voided. The freeze fee is not refunded
- **Flight sold out** -- full refund of the freeze fee

---

## Booking

### Booking Process

1. Select a flight (from search or a frozen one)
2. Enter passenger details (full name as on passport, date of birth, document number)
3. Choose additional services (baggage, seat selection)
4. Proceed to payment

### Payment Methods

| Method | Description |
|--------|-------------|
| MIR card | Standard payment via the MIR payment system |
| SBP (Fast Payment System) | Instant payment via QR code or link in your banking app |
| QR code | Scan in any banking app that supports SBP |

All payments are processed through **YooKassa** -- a certified payment provider.

### Electronic Ticket

After successful payment:

1. The electronic ticket (e-ticket) is sent to the Telegram bot
2. A copy is sent to your email (if provided)
3. It is available in your personal account under **"My Bookings"**
4. It contains a QR code for flight check-in

---

## Financial Protection

HopperRU offers two financial protection products for travelers.

### Cancel For Any Reason (CFAR)

**What it is:** Full refund of the ticket price when canceling a booking for **any** reason.

**Terms:**

| Parameter | Value |
|-----------|-------|
| Cost | Calculated individually (typically 5-15% of the ticket price) |
| Cancellation deadline | No later than 24 hours before departure |
| Refund | 100% of the ticket price |
| Processing time | Up to 10 business days |

**How to activate:**

1. When booking, enable the **"Cancel For Any Reason (CFAR)"** option
2. The protection cost is added to the total amount
3. Pay for the booking with the protection included

**How to get a refund:**

1. In your personal account or Telegram: `/cancel <booking_number>`
2. Confirm the cancellation
3. The refund will be sent to the original payment method within 10 business days

### Price Drop Protection

**What it is:** If the price of your flight drops after purchase, HopperRU automatically refunds the difference.

**Terms:**

| Parameter | Value |
|-----------|-------|
| Monitoring period | 10 days after purchase |
| Cost | Included with CFAR or purchased separately |
| Maximum refund | Difference between purchase price and minimum price during the period |
| Automatic | Yes, requires no action from the user |

**How to activate:**

1. When booking, enable the **"Price Drop Protection"** option
2. The system will monitor the price for 10 days

**How to get a refund:**

Automatically! If the price drops within 10 days of purchase:

1. You will receive a notification in Telegram
2. The difference will be refunded to the original payment method
3. No applications or documents are required

---

## Price Alerts

### What Is a Price Alert

A Price Alert monitors prices for a route you are interested in. When the price drops to your specified threshold (or changes significantly), you receive a notification in Telegram.

### How to Set Up an Alert

**In Telegram:**

```
/alert Moscow Sochi 15.07.2026 8000
```

Format: `/alert <from> <to> <date> <desired_price>`

Or interactively:

1. Send `/alert`
2. Specify the route and date
3. Set the desired price (or choose "Any drop")
4. Confirm

**In the web application:**

1. After a search, click the bell icon next to the route
2. Specify the desired price
3. Click **"Track"**

### Managing Alerts

```
/alerts         -- list all active alerts
/alert_off <id> -- disable a specific alert
```

### Limitations

- Maximum **10 active alerts** per user
- An alert is automatically removed after it triggers or the flight date arrives
- Price checks occur several times per day

---

## Personal Account

### Savings

The **"My Savings"** section displays:

- Total savings thanks to AI recommendations
- Savings per booking (difference between peak price and your purchase price)
- Refunds from Price Drop Protection
- Refunds from CFAR

### History

The **"History"** section contains:

- All bookings (active, completed, canceled)
- Price freeze history
- Payment and refund history
- Download electronic tickets and receipts

### Referral Program

Invite friends and earn bonuses:

1. Go to **"Referral Program"** in your personal account
2. Copy your personal link
3. Share it with friends
4. When a friend makes their first booking, you both receive a bonus

**In Telegram:**

```
/referral -- get your referral link
```

---

## FAQ

### 1. Is it free to use HopperRU for flight search?

Yes. Flight search, AI price predictions, and price alerts are completely free. Charges apply only for price freezes and financial protection (CFAR, Price Drop Protection).

### 2. Which airlines are available?

HopperRU works with major Russian airlines on domestic routes. The list is constantly expanding. Specific airlines are shown in search results.

### 3. How do I pay for a ticket? Do you accept Visa/Mastercard?

Payment is available via **MIR** card or **SBP** (Fast Payment System). Visa and Mastercard are not supported due to restrictions in Russia.

### 4. What happens if the airline cancels the flight?

If the airline cancels the flight, the refund is processed directly by the carrier. If you have active CFAR protection, you can also use it for an expedited refund.

### 5. Can I freeze a price and then not buy the ticket?

Yes. A price freeze does not obligate you to purchase the ticket. If you decide not to buy, the freeze simply expires. The freeze fee is not refunded (except in the case of a sold-out flight).

### 6. How accurate are the price predictions?

Initially, the system uses rules based on historical data (approximately 70% accuracy). As data accumulates, the ML model kicks in, increasing accuracy to 85% and above.

### 7. Is it safe to enter passport data?

Yes. All data is transmitted over an encrypted channel (TLS 1.2+) and stored in encrypted form on servers in Russia in accordance with Federal Law 152-FZ.

### 8. How do I delete my account and data?

Send `/delete_account` in the Telegram bot or write to support@hopperru.ru. Your personal data will be deleted within 30 days in accordance with Federal Law 152-FZ.

### 9. Is there a mobile app?

Currently, HopperRU is available via the Telegram bot and the web application. A mobile app for iOS and Android is planned for future releases.

### 10. Where can I get support?

- Telegram: send `/support` in the @HopperRU_bot
- Email: support@hopperru.ru
- Response time: up to 24 hours on business days
