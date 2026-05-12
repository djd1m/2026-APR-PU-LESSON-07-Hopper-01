# Pseudocode: HopperRU
**Версия:** 1.0 | **Дата:** 2026-05-12 | **Формат:** SPARC Pseudocode

---

## 1. Data Structures

### 1.1 Core Entities

```
ENTITY User:
  id:              UUID
  telegram_id:     String (nullable)       // Telegram user ID
  email:           String (nullable)       // Email for web registration
  phone:           String (nullable)       // +7 format
  name:            String
  home_airport:    AirportCode (default: SVO)
  preferences:     UserPreferences
  created_at:      DateTime
  updated_at:      DateTime
  deleted_at:      DateTime (nullable)     // Soft delete for 152-ФЗ

ENTITY UserPreferences:
  notification_channels:  Map<NotificationType, Channel[]>
  currency:               CurrencyCode (default: RUB)
  timezone:               Timezone (default: Europe/Moscow)
  language:               LanguageCode (default: ru)

ENUM NotificationType:
  PRICE_ALERT, BOOKING_UPDATE, WEEKLY_DIGEST, PROMO

ENUM Channel:
  TELEGRAM, EMAIL, PUSH
```

```
ENTITY Flight:
  id:              UUID
  airline:         AirlineCode          // SU, S7, DP, U6, FV
  flight_number:   String               // "SU-1234"
  origin:          AirportCode          // SVO, DME, VKO
  destination:     AirportCode          // AER, LED, IST
  departure_at:    DateTime
  arrival_at:      DateTime
  duration_min:    Integer
  cabin_class:     CabinClass           // ECONOMY, BUSINESS
  stops:           Integer
  available_seats: Integer
  price:           Money                // {amount: Decimal, currency: RUB}
  fetched_at:      DateTime             // When this price was observed
  source:          DataSource           // API_DIRECT, AGGREGATOR, SCRAPER

ENTITY Hotel:
  id:              UUID
  name:            String
  city:            String
  address:         String
  star_rating:     Integer (1-5)
  price_per_night: Money
  check_in_date:   Date
  check_out_date:  Date
  room_type:       String
  cancellation:    CancellationPolicy
  source:          DataSource
```

```
ENTITY Booking:
  id:              UUID
  user_id:         UUID -> User
  type:            BookingType          // FLIGHT, HOTEL, TRAIN
  status:          BookingStatus
  items:           BookingItem[]        // Flights, hotels in this booking
  passengers:      Passenger[]
  total_price:     Money
  payment_id:      String               // YooKassa payment ID
  payment_method:  PaymentMethod        // MIR, SBP, TELEGRAM
  pnr:             String (nullable)    // Airline PNR code
  protections:     Protection[]         // Active protections on this booking
  created_at:      DateTime
  confirmed_at:    DateTime (nullable)
  cancelled_at:    DateTime (nullable)
  cancellation_reason: String (nullable)

ENUM BookingStatus:
  PENDING          // Payment in progress
  CONFIRMED        // Paid and confirmed with supplier
  TICKETED         // E-ticket issued
  CHECKED_IN       // Passenger checked in
  COMPLETED        // Trip completed
  CANCELLED        // Cancelled (with or without refund)
  REFUNDED         // Refund processed

ENTITY Passenger:
  first_name:      String
  last_name:       String
  passport_number: String (encrypted)
  date_of_birth:   Date
  citizenship:     CountryCode
```

```
ENTITY PriceFreeze:
  id:              UUID
  user_id:         UUID -> User
  flight_id:       UUID -> Flight
  frozen_price:    Money               // Price locked at time of freeze
  freeze_fee:      Money               // ₽2,000-3,000
  fee_payment_id:  String              // YooKassa payment ID for the fee
  status:          FreezeStatus
  expires_at:      DateTime            // freeze_created_at + 21 days
  created_at:      DateTime
  used_at:         DateTime (nullable) // When user booked using this freeze
  booking_id:      UUID (nullable)     // Resulting booking if used

ENUM FreezeStatus:
  ACTIVE           // Freeze is active, user can book at frozen price
  USED             // User booked using this freeze
  EXPIRED          // 21 days passed without booking
  CANCELLED        // User cancelled (fee not refunded)
```

```
ENTITY Protection:
  id:              UUID
  booking_id:      UUID -> Booking
  type:            ProtectionType
  status:          ProtectionStatus
  premium:         Money               // Price user paid for protection
  coverage_amount: Money               // Max payout
  partner_policy:  String (nullable)   // Insurance partner policy number (for CFAR)
  valid_from:      DateTime
  valid_until:     DateTime
  claim_id:        String (nullable)
  payout_amount:   Money (nullable)
  payout_at:       DateTime (nullable)

ENUM ProtectionType:
  PRICE_FREEZE               // Covered via PriceFreeze entity
  CANCEL_FOR_ANY_REASON      // Via insurance partner
  PRICE_DROP                 // 10-day monitoring
  FLIGHT_DISRUPTION          // Delay/cancel rebooking (v2.0)

ENUM ProtectionStatus:
  ACTIVE           // Protection is active
  CLAIMED          // User made a claim
  PAID_OUT         // Claim approved and paid
  EXPIRED          // Protection period ended without claim
  VOIDED           // Booking cancelled, protection voided
```

```
ENTITY PricePrediction:
  id:              UUID
  route:           Route                // {origin: AirportCode, destination: AirportCode}
  departure_date:  Date
  prediction_date: Date                 // When this prediction was made
  current_price:   Money
  predicted_direction: PriceDirection   // UP, DOWN, STABLE
  confidence:      Float (0.0-1.0)
  recommended_action: Action           // BUY_NOW, WAIT, NO_DATA
  expected_savings: Money (nullable)
  wait_days:       Integer (nullable)   // "Wait N days"
  explanation:     String               // Human-readable Russian explanation
  model_version:   String               // "rule-v1", "ml-v2", etc.
  factors:         PredictionFactor[]   // What influenced this prediction

ENTITY PredictionFactor:
  name:            String               // "day_of_week", "advance_purchase", "seasonality"
  weight:          Float
  value:           String               // "tuesday", "45_days", "summer_peak"
  direction:       PriceDirection       // How this factor influences price

ENUM PriceDirection:
  UP, DOWN, STABLE

ENUM Action:
  BUY_NOW, WAIT, NO_DATA
```

---

## 2. Core Algorithms

### 2.1 PricePredictionEngine

```
MODULE PricePredictionEngine:

  // Phase 1: Rule-based prediction (MVP, target 70% accuracy)
  FUNCTION predict_rule_based(route: Route, departure_date: Date) -> PricePrediction:

    current_price = FlightAPI.get_current_price(route, departure_date)
    IF current_price IS NULL:
      RETURN PricePrediction(action: NO_DATA, confidence: 0.0)

    factors = []
    score = 0.0   // Positive = price will go UP, Negative = price will go DOWN

    // Factor 1: Days until departure (advance purchase discount curve)
    days_out = departure_date - today()
    IF days_out > 60:
      score += -0.2    // Far out -> likely to see lower prices
      factors.add(Factor("advance_purchase", -0.2, "60+_days", DOWN))
    ELIF days_out BETWEEN 21 AND 60:
      score += -0.1    // Sweet spot for many routes
      factors.add(Factor("advance_purchase", -0.1, "21-60_days", DOWN))
    ELIF days_out BETWEEN 7 AND 21:
      score += +0.3    // Prices typically rising
      factors.add(Factor("advance_purchase", +0.3, "7-21_days", UP))
    ELIF days_out < 7:
      score += +0.5    // Last-minute premium
      factors.add(Factor("advance_purchase", +0.5, "last_minute", UP))

    // Factor 2: Day of week
    dow = departure_date.day_of_week()
    IF dow IN [TUESDAY, WEDNESDAY]:
      score += -0.15   // Historically cheapest days
      factors.add(Factor("day_of_week", -0.15, dow, DOWN))
    ELIF dow IN [FRIDAY, SUNDAY]:
      score += +0.15   // Weekend premium
      factors.add(Factor("day_of_week", +0.15, dow, UP))

    // Factor 3: Seasonality
    month = departure_date.month()
    season_factor = get_season_factor(route, month)  // From historical data table
    score += season_factor
    factors.add(Factor("seasonality", season_factor, month, sign(season_factor)))

    // Factor 4: Holiday proximity
    holiday = nearest_holiday(departure_date, route.destination)
    IF holiday IS NOT NULL AND days_to_holiday < 14:
      score += +0.25
      factors.add(Factor("holiday", +0.25, holiday.name, UP))

    // Factor 5: Historical price trend (last 7 days)
    trend = PriceHistory.get_trend(route, departure_date, window: 7)
    IF trend.direction == UP AND trend.magnitude > 5%:
      score += +0.2
      factors.add(Factor("recent_trend", +0.2, "rising_5%+", UP))
    ELIF trend.direction == DOWN AND trend.magnitude > 5%:
      score += -0.2
      factors.add(Factor("recent_trend", -0.2, "falling_5%+", DOWN))

    // Factor 6: Competitor pricing comparison
    competitor_prices = get_competitor_prices(route, departure_date)
    IF current_price < percentile(competitor_prices, 25):
      score += +0.1    // Already cheap -> likely to go up
      factors.add(Factor("competitor_position", +0.1, "below_p25", UP))
    ELIF current_price > percentile(competitor_prices, 75):
      score += -0.1    // Expensive -> room to drop
      factors.add(Factor("competitor_position", -0.1, "above_p75", DOWN))

    // Calculate prediction
    confidence = MIN(0.70, 0.5 + ABS(score) * 0.3)  // Cap at 70% for rule-based

    IF score > 0.15:
      direction = UP
      action = BUY_NOW
      explanation = format_explanation_ru(factors, "buy_now")
    ELIF score < -0.15:
      direction = DOWN
      action = WAIT
      wait_days = estimate_wait_days(score, days_out)
      expected_savings = estimate_savings(current_price, score)
      explanation = format_explanation_ru(factors, "wait")
    ELSE:
      direction = STABLE
      action = BUY_NOW  // Default to buy when uncertain
      explanation = "Цена стабильна. Существенных изменений не ожидается."

    RETURN PricePrediction(
      route, departure_date, today(),
      current_price, direction, confidence, action,
      expected_savings, wait_days, explanation,
      model_version: "rule-v1", factors
    )

  // Phase 2: ML-based prediction (v1.0, target 85% accuracy)
  FUNCTION predict_ml(route: Route, departure_date: Date) -> PricePrediction:

    features = extract_features(route, departure_date)
    // Features: [days_out, dow, month, holiday_dist, trend_7d, trend_30d,
    //            price_percentile, competitor_gap, historical_vol, load_factor]

    model = ModelRegistry.get_latest("price_prediction_v2")
    raw_prediction = model.predict(features)
    // Output: {direction_prob: [p_up, p_down, p_stable], magnitude: float, confidence: float}

    // Calibrate and threshold
    IF raw_prediction.confidence < 0.5:
      RETURN predict_rule_based(route, departure_date)  // Fallback to rules

    // ... (transform to PricePrediction, similar to rule-based output)

  // Dispatcher: selects model based on data availability
  FUNCTION predict(route: Route, departure_date: Date) -> PricePrediction:

    data_points = PriceHistory.count(route, window: 90)

    IF data_points >= 1000 AND FeatureFlags.is_enabled("ml_prediction"):
      RETURN predict_ml(route, departure_date)
    ELSE:
      RETURN predict_rule_based(route, departure_date)

  // Helper: estimate how many days to wait
  FUNCTION estimate_wait_days(score: Float, days_out: Integer) -> Integer:
    IF days_out > 30:
      RETURN MIN(7, ROUND(ABS(score) * 10))
    ELIF days_out > 14:
      RETURN MIN(3, ROUND(ABS(score) * 5))
    ELSE:
      RETURN 1  // Very close to departure, don't wait too long

  // Helper: estimate savings
  FUNCTION estimate_savings(current_price: Money, score: Float) -> Money:
    savings_pct = MIN(0.30, ABS(score) * 0.15)  // Max 30% predicted savings
    RETURN current_price * savings_pct
```

### 2.2 PriceFreezeManager

```
MODULE PriceFreezeManager:

  CONSTANT MAX_ACTIVE_FREEZES_PER_USER = 3
  CONSTANT FREEZE_DURATION_DAYS = 21
  CONSTANT MIN_FREEZE_FEE = 2000  // RUB
  CONSTANT MAX_FREEZE_FEE = 3000  // RUB

  // Create a new price freeze
  FUNCTION create_freeze(user_id: UUID, flight_id: UUID) -> Result<PriceFreeze, Error>:

    // Validate user can create freeze
    active_freezes = FreezeRepo.count_active(user_id)
    IF active_freezes >= MAX_ACTIVE_FREEZES_PER_USER:
      RETURN Error("Максимум 3 активных заморозки. Дождитесь истечения или используйте существующие.")

    // Get current flight price
    flight = FlightAPI.get_flight(flight_id)
    IF flight IS NULL OR flight.available_seats == 0:
      RETURN Error("Рейс недоступен для заморозки")

    // Calculate freeze fee based on route volatility
    volatility = PriceHistory.get_volatility(flight.route, window: 30)
    freeze_fee = calculate_freeze_fee(flight.price, volatility)

    // Create payment via YooKassa
    payment = PaymentService.create_payment(
      amount: freeze_fee,
      description: "Заморозка цены: {flight.route} на {flight.departure_at}",
      method: user.preferred_payment_method,
      metadata: {type: "price_freeze", flight_id: flight_id}
    )

    IF payment.status != SUCCESS:
      RETURN Error("Оплата не прошла: {payment.error}")

    // Create freeze record
    freeze = PriceFreeze(
      id: generate_uuid(),
      user_id: user_id,
      flight_id: flight_id,
      frozen_price: flight.price,
      freeze_fee: freeze_fee,
      fee_payment_id: payment.id,
      status: ACTIVE,
      expires_at: now() + FREEZE_DURATION_DAYS.days,
      created_at: now()
    )

    FreezeRepo.save(freeze)

    // Notify user
    NotificationService.send(user_id, TELEGRAM,
      "Цена заморожена! {flight.route}: ₽{flight.price.amount} на {FREEZE_DURATION_DAYS} дней. "
      + "Истекает: {freeze.expires_at.format('DD.MM.YYYY')}"
    )

    RETURN Ok(freeze)

  // Calculate freeze fee based on price and volatility
  FUNCTION calculate_freeze_fee(price: Money, volatility: Float) -> Money:
    // Base: 3-5% of price, adjusted by volatility
    base_pct = 0.03 + (volatility * 0.02)  // 3% + up to 2% volatility premium
    fee = price.amount * base_pct
    RETURN Money(CLAMP(fee, MIN_FREEZE_FEE, MAX_FREEZE_FEE), RUB)

  // Use freeze to book at frozen price
  FUNCTION use_freeze(freeze_id: UUID) -> Result<BookingPrice, Error>:

    freeze = FreezeRepo.get(freeze_id)

    IF freeze.status != ACTIVE:
      RETURN Error("Заморозка уже использована или истекла")

    IF freeze.expires_at < now():
      freeze.status = EXPIRED
      FreezeRepo.save(freeze)
      RETURN Error("Заморозка истекла {freeze.expires_at.format('DD.MM.YYYY')}")

    // Get current market price
    current_price = FlightAPI.get_current_price_for_flight(freeze.flight_id)

    // User ALWAYS gets the lower of frozen vs current
    booking_price = MIN(freeze.frozen_price, current_price)

    // Mark freeze as used
    freeze.status = USED
    freeze.used_at = now()
    FreezeRepo.save(freeze)

    savings = freeze.frozen_price - booking_price
    IF savings > 0:
      RETURN Ok(BookingPrice(amount: booking_price, savings: savings, source: "market_lower"))
    ELSE:
      savings = current_price - freeze.frozen_price
      RETURN Ok(BookingPrice(amount: booking_price, savings: savings, source: "freeze_lower"))

  // Background job: expire stale freezes
  FUNCTION expire_stale_freezes():
    // Runs every hour via cron
    expired = FreezeRepo.find_active_past_expiry(now())
    FOR freeze IN expired:
      freeze.status = EXPIRED
      FreezeRepo.save(freeze)
      NotificationService.send(freeze.user_id, TELEGRAM,
        "Заморозка истекла. Рейс {freeze.flight_id}: текущая цена ₽{current_price}."
      )
```

### 2.3 ProtectionBundleCalculator

```
MODULE ProtectionBundleCalculator:

  CONSTANT CFAR_BASE_RATE = 0.12          // 12% of booking price
  CONSTANT PRICE_DROP_FLAT_FEE = 1500     // RUB
  CONSTANT DISRUPTION_BASE_RATE = 0.10    // 10% of booking price
  CONSTANT BUNDLE_DISCOUNT = 0.20         // 20% off when buying 2+ products

  // Calculate available protections for a booking
  FUNCTION calculate_options(booking_price: Money, route: Route, departure_date: Date)
    -> ProtectionOptions:

    options = []
    volatility = PriceHistory.get_volatility(route, window: 30)

    // Cancel For Any Reason (requires insurance partner)
    IF FeatureFlags.is_enabled("cfar"):
      cfar_premium = calculate_cfar_premium(booking_price, route, departure_date)
      options.add(ProtectionOption(
        type: CANCEL_FOR_ANY_REASON,
        premium: cfar_premium,
        coverage: booking_price,       // Full booking price refund
        description: "Отмена по любой причине — полный возврат стоимости билета",
        terms: "Действует до момента вылета. Возврат в течение 5 рабочих дней.",
        partner: "АльфаСтрахование"    // Insurance partner
      ))

    // Price Drop Protection
    IF FeatureFlags.is_enabled("price_drop"):
      pd_premium = calculate_price_drop_premium(booking_price, volatility)
      pd_max_coverage = booking_price * 0.5  // Max 50% of booking price
      options.add(ProtectionOption(
        type: PRICE_DROP,
        premium: pd_premium,
        coverage: pd_max_coverage,
        description: "Защита от снижения цены — мониторинг 10 дней, возврат разницы",
        terms: "Мониторинг 10 дней. Макс. возврат: 50% стоимости билета.",
        partner: NULL                  // Self-funded
      ))

    // Flight Disruption Guarantee (v2.0)
    IF FeatureFlags.is_enabled("disruption_guarantee"):
      dg_premium = calculate_disruption_premium(booking_price, route)
      options.add(ProtectionOption(
        type: FLIGHT_DISRUPTION,
        premium: dg_premium,
        coverage: booking_price * 1.5,  // Up to 150% for rebooking
        description: "Гарантия при задержке — бесплатное перебронирование при задержке 2+ часа",
        terms: "Перебронирование в тот же день. Или возврат полной стоимости.",
        partner: "Ингосстрах"
      ))

    // Calculate bundle if 2+ options
    IF options.length >= 2:
      bundle_price = SUM(options.map(o -> o.premium)) * (1 - BUNDLE_DISCOUNT)
      bundle = BundleOption(
        products: options,
        individual_total: SUM(options.map(o -> o.premium)),
        bundle_price: bundle_price,
        savings: SUM(options.map(o -> o.premium)) - bundle_price,
        description: "Полная защита — скидка {BUNDLE_DISCOUNT*100}%"
      )
      RETURN ProtectionOptions(individual: options, bundle: bundle)

    RETURN ProtectionOptions(individual: options, bundle: NULL)

  // CFAR premium: based on booking price, route risk, time to departure
  FUNCTION calculate_cfar_premium(booking_price: Money, route: Route, departure: Date) -> Money:
    days_out = departure - today()
    time_factor = IF days_out > 30 THEN 1.0 ELIF days_out > 14 THEN 1.2 ELSE 1.5
    route_risk = get_route_cancellation_risk(route)  // Historical data
    premium = booking_price.amount * CFAR_BASE_RATE * time_factor * route_risk
    RETURN Money(CLAMP(premium, 1500, 5000), RUB)

  // Price Drop premium: based on volatility
  FUNCTION calculate_price_drop_premium(booking_price: Money, volatility: Float) -> Money:
    vol_factor = 1.0 + (volatility * 0.5)  // Higher volatility = higher premium
    premium = PRICE_DROP_FLAT_FEE * vol_factor
    RETURN Money(CLAMP(premium, 1000, 2500), RUB)

  // Disruption premium: based on route reliability
  FUNCTION calculate_disruption_premium(booking_price: Money, route: Route) -> Money:
    on_time_pct = get_route_on_time_percentage(route)  // From flight stats
    risk_factor = 1.0 + (1.0 - on_time_pct) * 2.0    // Higher delay risk = higher premium
    premium = booking_price.amount * DISRUPTION_BASE_RATE * risk_factor
    RETURN Money(CLAMP(premium, 1500, 4000), RUB)
```

### 2.4 BookingOrchestrator

```
MODULE BookingOrchestrator:

  // Main booking flow: Search -> Predict -> (Freeze) -> Book -> Protect
  FUNCTION create_booking(request: BookingRequest) -> Result<Booking, Error>:

    // Step 1: Validate request
    validation = validate_booking_request(request)
    IF validation.has_errors:
      RETURN Error(validation.errors)

    // Step 2: Check for active price freeze
    active_freeze = NULL
    IF request.freeze_id IS NOT NULL:
      freeze_result = PriceFreezeManager.use_freeze(request.freeze_id)
      IF freeze_result.is_error:
        RETURN Error(freeze_result.error)
      active_freeze = freeze_result.value

    // Step 3: Get final price
    IF active_freeze IS NOT NULL:
      final_price = active_freeze.amount
    ELSE:
      flight = FlightAPI.get_flight(request.flight_id)
      IF flight IS NULL:
        RETURN Error("Рейс больше недоступен")
      final_price = flight.price

    // Step 4: Calculate protection costs
    protection_total = Money(0, RUB)
    selected_protections = []
    IF request.protections IS NOT NULL:
      FOR prot IN request.protections:
        options = ProtectionBundleCalculator.calculate_options(
          final_price, flight.route, flight.departure_at
        )
        IF request.use_bundle AND options.bundle IS NOT NULL:
          protection_total = options.bundle.bundle_price
          selected_protections = options.bundle.products
          BREAK
        ELSE:
          option = options.individual.find(o -> o.type == prot.type)
          IF option IS NOT NULL:
            protection_total += option.premium
            selected_protections.add(option)

    // Step 5: Calculate total
    total = final_price + protection_total

    // Step 6: Create payment
    payment = PaymentService.create_payment(
      amount: total,
      description: "Бронирование: {flight.route} + защита",
      method: request.payment_method,
      metadata: {
        type: "booking",
        flight_id: request.flight_id,
        protections: selected_protections.map(p -> p.type)
      }
    )

    IF payment.status != SUCCESS:
      // If freeze was used, revert it
      IF active_freeze IS NOT NULL:
        PriceFreezeManager.revert_freeze(request.freeze_id)
      RETURN Error("Оплата не прошла: {payment.error}")

    // Step 7: Book with supplier
    supplier_result = SupplierAPI.book(
      flight_id: request.flight_id,
      passengers: request.passengers,
      payment_ref: payment.id
    )

    IF supplier_result.is_error:
      PaymentService.refund(payment.id)
      IF active_freeze IS NOT NULL:
        PriceFreezeManager.revert_freeze(request.freeze_id)
      RETURN Error("Бронирование не подтверждено поставщиком. Средства возвращены.")

    // Step 8: Create booking record
    booking = Booking(
      id: generate_uuid(),
      user_id: request.user_id,
      type: FLIGHT,
      status: CONFIRMED,
      items: [BookingItem(flight)],
      passengers: request.passengers,
      total_price: total,
      payment_id: payment.id,
      payment_method: request.payment_method,
      pnr: supplier_result.pnr,
      protections: [],
      created_at: now(),
      confirmed_at: now()
    )

    // Step 9: Activate protections
    FOR prot_option IN selected_protections:
      protection = Protection(
        id: generate_uuid(),
        booking_id: booking.id,
        type: prot_option.type,
        status: ACTIVE,
        premium: prot_option.premium,
        coverage_amount: prot_option.coverage,
        partner_policy: activate_with_partner(prot_option),
        valid_from: now(),
        valid_until: calculate_protection_expiry(prot_option, flight)
      )
      ProtectionRepo.save(protection)
      booking.protections.add(protection)

      // Start Price Drop monitoring if applicable
      IF prot_option.type == PRICE_DROP:
        PriceDropMonitor.start(booking.id, flight.route, flight.departure_at, final_price)

    BookingRepo.save(booking)

    // Step 10: Send confirmations
    send_booking_confirmation(booking)

    RETURN Ok(booking)

  // Validate booking request
  FUNCTION validate_booking_request(request: BookingRequest) -> ValidationResult:
    errors = []

    IF request.passengers IS EMPTY:
      errors.add("Укажите хотя бы одного пассажира")

    FOR passenger IN request.passengers:
      IF passenger.first_name IS EMPTY OR passenger.last_name IS EMPTY:
        errors.add("Имя и фамилия обязательны для всех пассажиров")
      IF passenger.passport_number IS EMPTY:
        errors.add("Номер паспорта обязателен")
      IF NOT is_valid_passport(passenger.passport_number):
        errors.add("Некорректный номер паспорта: {passenger.passport_number}")

    IF request.payment_method NOT IN [MIR, SBP, TELEGRAM]:
      errors.add("Неподдерживаемый способ оплаты")

    RETURN ValidationResult(errors)

  // Send confirmation via all channels
  FUNCTION send_booking_confirmation(booking: Booking):
    user = UserRepo.get(booking.user_id)

    // Telegram
    IF user.telegram_id IS NOT NULL:
      message = format_booking_confirmation_telegram(booking)
      TelegramBot.send(user.telegram_id, message)

    // Email
    IF user.email IS NOT NULL:
      email = format_booking_confirmation_email(booking)
      EmailService.send(user.email, email)

    // Calculate and show savings
    prediction = PricePredictionEngine.predict(booking.route, booking.departure_date)
    IF prediction.action == BUY_NOW AND prediction.expected_savings > 0:
      savings_msg = "Вы сэкономили ~₽{prediction.expected_savings} купив сейчас!"
      TelegramBot.send(user.telegram_id, savings_msg + "\n[Поделиться с друзьями]")
```

---

## 3. API Contracts

### 3.1 Search API

```
POST /api/v1/search
  Request:
    {
      "origin": "SVO",                   // AirportCode (required)
      "destination": "AER",              // AirportCode (required)
      "departure_date": "2026-07-15",    // Date (required)
      "return_date": "2026-07-22",       // Date (optional, one-way if omitted)
      "passengers": 1,                   // Integer 1-9 (default: 1)
      "cabin_class": "economy",          // "economy" | "business" (default: economy)
      "flexible_dates": false            // Boolean (default: false, +/- 3 days)
    }

  Response 200:
    {
      "results": [
        {
          "id": "uuid",
          "airline": "SU",
          "flight_number": "SU-1234",
          "origin": "SVO",
          "destination": "AER",
          "departure_at": "2026-07-15T08:30:00+03:00",
          "arrival_at": "2026-07-15T11:00:00+03:00",
          "duration_min": 150,
          "stops": 0,
          "price": {"amount": 8500, "currency": "RUB"},
          "available_seats": 12,
          "prediction": {
            "action": "BUY_NOW",
            "confidence": 0.68,
            "direction": "UP",
            "explanation": "Цена с вероятностью 68% вырастет в ближайшие 5 дней",
            "expected_savings": null,
            "wait_days": null
          }
        }
      ],
      "calendar": {
        "dates": [
          {"date": "2026-07-14", "min_price": 7200, "tier": "green"},
          {"date": "2026-07-15", "min_price": 8500, "tier": "yellow"},
          {"date": "2026-07-16", "min_price": 11000, "tier": "red"}
        ]
      },
      "total_results": 15,
      "search_id": "uuid"
    }

  Response 422: Validation error
  Response 503: Supplier API unavailable
```

### 3.2 Predict API

```
GET /api/v1/predict?route=SVO-AER&date=2026-07-15
  Response 200:
    {
      "prediction": {
        "route": {"origin": "SVO", "destination": "AER"},
        "departure_date": "2026-07-15",
        "current_price": {"amount": 8500, "currency": "RUB"},
        "action": "BUY_NOW",
        "confidence": 0.68,
        "direction": "UP",
        "explanation": "Цена с вероятностью 68% вырастет. Факторы: до вылета 14 дней (+), летний сезон (+), вторник (-).",
        "expected_savings": null,
        "wait_days": null,
        "model_version": "rule-v1",
        "factors": [
          {"name": "advance_purchase", "weight": 0.3, "direction": "UP"},
          {"name": "seasonality", "weight": 0.25, "direction": "UP"},
          {"name": "day_of_week", "weight": -0.15, "direction": "DOWN"}
        ]
      },
      "generated_at": "2026-07-01T12:00:00+03:00",
      "next_update_at": "2026-07-01T18:00:00+03:00"
    }
```

### 3.3 Freeze API

```
POST /api/v1/freeze
  Headers: Authorization: Bearer <jwt>
  Request:
    {
      "flight_id": "uuid",
      "payment_method": "mir"            // "mir" | "sbp" | "telegram"
    }

  Response 201:
    {
      "freeze": {
        "id": "uuid",
        "flight_id": "uuid",
        "frozen_price": {"amount": 8500, "currency": "RUB"},
        "freeze_fee": {"amount": 2500, "currency": "RUB"},
        "status": "active",
        "expires_at": "2026-07-22T12:00:00+03:00",
        "created_at": "2026-07-01T12:00:00+03:00"
      }
    }

  Response 400: Max freezes reached / Flight unavailable
  Response 402: Payment failed

DELETE /api/v1/freeze/{freeze_id}
  Response 200: Freeze cancelled (fee not refunded)

POST /api/v1/freeze/{freeze_id}/use
  Response 200:
    {
      "booking_price": {"amount": 8500, "currency": "RUB"},
      "market_price": {"amount": 11000, "currency": "RUB"},
      "savings": {"amount": 2500, "currency": "RUB"},
      "source": "freeze_lower"           // "freeze_lower" | "market_lower"
    }
```

### 3.4 Book API

```
POST /api/v1/book
  Headers: Authorization: Bearer <jwt>
  Request:
    {
      "flight_id": "uuid",
      "freeze_id": "uuid",               // Optional: use frozen price
      "passengers": [
        {
          "first_name": "Иван",
          "last_name": "Иванов",
          "passport_number": "encrypted_value",
          "date_of_birth": "1990-05-15",
          "citizenship": "RU"
        }
      ],
      "protections": [                    // Optional
        {"type": "cancel_for_any_reason"},
        {"type": "price_drop"}
      ],
      "use_bundle": true,                // Apply bundle discount
      "payment_method": "sbp"
    }

  Response 201:
    {
      "booking": {
        "id": "uuid",
        "status": "confirmed",
        "pnr": "ABC123",
        "total_price": {"amount": 11700, "currency": "RUB"},
        "breakdown": {
          "flight": {"amount": 8500, "currency": "RUB"},
          "protections": {"amount": 3200, "currency": "RUB"}
        },
        "protections": [
          {
            "type": "cancel_for_any_reason",
            "status": "active",
            "coverage": {"amount": 8500, "currency": "RUB"},
            "valid_until": "2026-07-15T08:30:00+03:00"
          },
          {
            "type": "price_drop",
            "status": "active",
            "monitoring_until": "2026-07-11T12:00:00+03:00"
          }
        ],
        "confirmed_at": "2026-07-01T12:01:00+03:00"
      }
    }

  Response 400: Validation error
  Response 402: Payment failed
  Response 409: Flight no longer available
```

### 3.5 Protect API

```
GET /api/v1/protect/options?flight_id={uuid}
  Headers: Authorization: Bearer <jwt>
  Response 200:
    {
      "individual": [
        {
          "type": "cancel_for_any_reason",
          "premium": {"amount": 2500, "currency": "RUB"},
          "coverage": {"amount": 8500, "currency": "RUB"},
          "description": "Отмена по любой причине — полный возврат",
          "partner": "АльфаСтрахование"
        },
        {
          "type": "price_drop",
          "premium": {"amount": 1500, "currency": "RUB"},
          "coverage": {"amount": 4250, "currency": "RUB"},
          "description": "Защита от снижения цены — мониторинг 10 дней"
        }
      ],
      "bundle": {
        "products": ["cancel_for_any_reason", "price_drop"],
        "individual_total": {"amount": 4000, "currency": "RUB"},
        "bundle_price": {"amount": 3200, "currency": "RUB"},
        "savings": {"amount": 800, "currency": "RUB"},
        "discount_pct": 20
      }
    }

POST /api/v1/protect/claim
  Headers: Authorization: Bearer <jwt>
  Request:
    {
      "protection_id": "uuid",
      "reason": "trip_cancelled"         // For CFAR: any reason accepted
    }

  Response 200:
    {
      "claim": {
        "id": "uuid",
        "protection_type": "cancel_for_any_reason",
        "status": "approved",
        "payout_amount": {"amount": 8500, "currency": "RUB"},
        "estimated_payout_date": "2026-07-08",
        "refund_method": "original_payment"
      }
    }
```

---

## 4. State Transitions

### 4.1 Booking Lifecycle

```
                    ┌──────────┐
                    │ PENDING  │  <- Payment initiated
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │ Payment  │ Payment  │
              │ Success  │ Failed   │
              ▼          ▼          │
        ┌───────────┐ ┌─────────┐  │
        │ CONFIRMED │ │  (end)  │  │
        └─────┬─────┘ └─────────┘  │
              │                     │
              │ E-ticket issued     │
              ▼                     │
        ┌───────────┐              │
        │ TICKETED  │              │
        └─────┬─────┘              │
              │                     │
     ┌────────┼────────┐           │
     │ Check-in│ Cancel │           │
     ▼        ▼        │           │
┌──────────┐ ┌──────────┐         │
│CHECKED_IN│ │CANCELLED │         │
└────┬─────┘ └────┬─────┘         │
     │             │               │
     │ Trip done   │ Refund        │
     ▼             ▼               │
┌──────────┐ ┌──────────┐         │
│COMPLETED │ │ REFUNDED │         │
└──────────┘ └──────────┘         │

Valid transitions:
  PENDING    -> CONFIRMED (payment success)
  PENDING    -> (deleted) (payment failed, timeout 15 min)
  CONFIRMED  -> TICKETED (e-ticket issued by supplier)
  CONFIRMED  -> CANCELLED (user cancels before ticketing)
  TICKETED   -> CHECKED_IN (passenger checks in)
  TICKETED   -> CANCELLED (user cancels with/without CFAR)
  CHECKED_IN -> COMPLETED (flight departed, trip finished)
  CANCELLED  -> REFUNDED (refund processed)
```

### 4.2 Price Freeze Lifecycle

```
  ┌──────────┐
  │  ACTIVE  │  <- Fee paid, price locked
  └────┬─────┘
       │
  ┌────┼──────────┐
  │ Used │ 21 days │ User cancels
  │      │ passed  │
  ▼      ▼         ▼
┌──────┐ ┌───────┐ ┌───────────┐
│ USED │ │EXPIRED│ │ CANCELLED │
└──────┘ └───────┘ └───────────┘

  ACTIVE    -> USED (user books via freeze)
  ACTIVE    -> EXPIRED (21 days elapsed)
  ACTIVE    -> CANCELLED (user cancels, fee non-refundable)
```

### 4.3 Protection Lifecycle

```
  ┌──────────┐
  │  ACTIVE  │  <- Purchased with booking
  └────┬─────┘
       │
  ┌────┼──────────┐────────────┐
  │ Claim │ Period │ Booking    │
  │ made  │ ends   │ cancelled  │
  ▼       ▼        ▼            │
┌───────┐ ┌───────┐ ┌────────┐ │
│CLAIMED│ │EXPIRED│ │ VOIDED │ │
└───┬───┘ └───────┘ └────────┘ │
    │                           │
    │ Approved & paid           │
    ▼                           │
┌──────────┐                   │
│ PAID_OUT │                   │
└──────────┘                   │

  ACTIVE   -> CLAIMED (user initiates claim)
  ACTIVE   -> EXPIRED (protection period ended, no claim)
  ACTIVE   -> VOIDED (booking cancelled without using this protection)
  CLAIMED  -> PAID_OUT (claim approved, funds transferred)
```

---

## 5. Error Handling Strategy

### 5.1 Error Classification

```
ENUM ErrorSeverity:
  TRANSIENT       // Retry will likely succeed (network timeout, rate limit)
  RECOVERABLE     // User action can fix (invalid input, payment declined)
  FATAL           // Cannot recover (supplier API down, data corruption)

ENUM ErrorCategory:
  VALIDATION      // Invalid user input
  PAYMENT         // Payment processing failure
  SUPPLIER        // Flight/hotel supplier API error
  PREDICTION      // Price prediction engine failure
  INFRASTRUCTURE  // Database, cache, message queue failures
  AUTHORIZATION   // Auth/permission errors
```

### 5.2 Retry Strategy

```
FUNCTION handle_with_retry(operation: Function, config: RetryConfig) -> Result:

  FOR attempt IN 1..config.max_retries:
    TRY:
      result = operation()
      RETURN Ok(result)
    CATCH error:
      IF error.severity == FATAL:
        log_error(error, attempt)
        RETURN Error(error)

      IF error.severity == TRANSIENT:
        delay = config.base_delay * (2 ^ (attempt - 1))  // Exponential backoff
        delay = delay + random(0, delay * 0.1)            // Jitter
        WAIT(MIN(delay, config.max_delay))
        CONTINUE

      IF error.severity == RECOVERABLE:
        RETURN Error(error)  // Don't retry, return to user

  RETURN Error(MaxRetriesExceeded(config.max_retries))

DEFAULT_RETRY_CONFIGS:
  supplier_api:    {max_retries: 3, base_delay: 1s, max_delay: 10s}
  payment:         {max_retries: 2, base_delay: 2s, max_delay: 5s}
  prediction:      {max_retries: 1, base_delay: 0s, max_delay: 0s}  // Fallback instead
  database:        {max_retries: 3, base_delay: 500ms, max_delay: 5s}
```

### 5.3 Fallback Strategy

```
FUNCTION get_prediction_with_fallback(route, date) -> PricePrediction:
  TRY:
    RETURN PricePredictionEngine.predict(route, date)
  CATCH PredictionError:
    // Fallback: return historical trend without recommendation
    trend = PriceHistory.get_trend(route, date, window: 30)
    RETURN PricePrediction(
      action: NO_DATA,
      confidence: 0.0,
      explanation: "Прогноз временно недоступен. Показана история цен за 30 дней.",
      factors: [Factor("historical_trend", 0, trend.summary, STABLE)]
    )

FUNCTION book_with_fallback(request) -> Result:
  TRY:
    RETURN BookingOrchestrator.create_booking(request)
  CATCH SupplierTimeout:
    // Queue for async processing
    BookingQueue.enqueue(request)
    RETURN Pending("Бронирование обрабатывается. Вы получите подтверждение в течение 5 минут.")
  CATCH SupplierUnavailable:
    RETURN Error("Поставщик временно недоступен. Попробуйте через 5 минут.")
```

### 5.4 User-Facing Error Messages (Russian)

```
ERROR_MESSAGES = {
  // Validation
  "invalid_dates":        "Некорректные даты. Дата вылета должна быть в будущем.",
  "invalid_passport":     "Некорректный номер паспорта. Проверьте данные.",
  "invalid_route":        "Маршрут не найден. Проверьте города отправления и назначения.",

  // Payment
  "payment_declined":     "Оплата отклонена. Попробуйте другой способ оплаты.",
  "insufficient_funds":   "Недостаточно средств на карте.",
  "payment_timeout":      "Время ожидания оплаты истекло. Попробуйте снова.",

  // Booking
  "flight_unavailable":   "Рейс больше недоступен. Найдены похожие варианты.",
  "seats_exhausted":      "Места на этот рейс закончились.",
  "booking_timeout":      "Бронирование обрабатывается. Подтверждение придёт в Telegram.",

  // Freeze
  "max_freezes":          "Максимум 3 активных заморозки. Дождитесь истечения или используйте.",
  "freeze_expired":       "Заморозка истекла. Текущая цена: ₽{price}.",

  // System
  "service_unavailable":  "Сервис временно недоступен. Попробуйте через 5 минут.",
  "rate_limited":         "Слишком много запросов. Подождите немного."
}
```

### 5.5 Compensation Transactions

```
// When a multi-step operation partially fails, compensate
FUNCTION compensate_failed_booking(booking_id: UUID, failed_step: String):

  MATCH failed_step:
    CASE "supplier_booking":
      // Payment succeeded but supplier failed -> refund
      PaymentService.refund(booking.payment_id)
      IF booking.freeze_id IS NOT NULL:
        PriceFreezeManager.revert_freeze(booking.freeze_id)
      BookingRepo.delete(booking_id)
      NotificationService.send(booking.user_id, TELEGRAM,
        "Бронирование не подтверждено поставщиком. Средства возвращены на карту.")

    CASE "protection_activation":
      // Booking succeeded but protection failed -> book without protection
      log_warning("Protection activation failed for booking {booking_id}")
      NotificationService.send(booking.user_id, TELEGRAM,
        "Бронирование подтверждено, но защита не была активирована. Обратитесь в поддержку.")

    CASE "notification":
      // Non-critical -> queue for retry
      NotificationQueue.enqueue(booking_id, retry_in: 5.minutes)
```

---

## 6. Background Jobs

```
CRON_JOBS:

  // Every 30 minutes: check prices for active alerts and price drop monitoring
  "*/30 * * * *"  ->  PriceMonitor.check_all_active()

  // Every hour: expire stale price freezes
  "0 * * * *"     ->  PriceFreezeManager.expire_stale_freezes()

  // Every 6 hours: recalculate predictions for popular routes
  "0 */6 * * *"   ->  PricePredictionEngine.batch_predict(popular_routes())

  // Daily at 3 AM: cleanup expired alerts, generate daily analytics
  "0 3 * * *"     ->  MaintenanceJob.daily_cleanup()

  // Daily at 9 AM: send weekly digest (on Mondays only)
  "0 9 * * 1"     ->  DigestService.send_weekly_digests()

  // Every 5 minutes: process async booking queue
  "*/5 * * * *"   ->  BookingQueue.process_pending()
```
