# C4 Diagrams: HopperRU
**Version:** 1.0 | **Date:** 2026-05-12 | **Status:** Draft

---

## Level 1: System Context

Shows HopperRU and all external actors it interacts with.

```mermaid
C4Context
    title System Context Diagram — HopperRU

    Person(traveler, "Traveler", "Russian domestic/international traveler seeking flights, hotels, fintech protection")
    Person(admin, "Admin", "Platform operator managing bookings, monitoring, support")

    System(hopperru, "HopperRU Platform", "AI-powered travel booking with fintech protection products: Price Freeze, CFAR, Price Drop Protection")

    System_Ext(telegram, "Telegram", "Messaging platform, 90M+ RU users, bot hosting and payments")
    System_Ext(airlines, "Airline GDS / APIs", "Amadeus, Sabre, direct airline APIs for flight search and booking")
    System_Ext(hotels, "Hotel Aggregator APIs", "Hotel inventory search and reservation")
    System_Ext(yookassa, "YooKassa", "Payment gateway supporting MIR, SBP, bank cards")
    System_Ext(insurance, "Insurance Partner", "AlfaStrakhovanie / Ingosstrakh — licensed insurer for CFAR, flight disruption")
    System_Ext(yandex, "Yandex Search", "SEO traffic source for travel queries")

    Rel(traveler, hopperru, "Searches, books, buys fintech products", "HTTPS / Telegram Bot")
    Rel(admin, hopperru, "Manages platform, resolves support tickets", "HTTPS (admin panel)")
    Rel(hopperru, telegram, "Sends notifications, processes bot commands", "Telegram Bot API")
    Rel(hopperru, airlines, "Searches flights, creates PNRs", "REST / SOAP")
    Rel(hopperru, hotels, "Searches hotels, creates reservations", "REST")
    Rel(hopperru, yookassa, "Processes payments, handles refunds", "REST + Webhooks")
    Rel(hopperru, insurance, "Files claims, checks policy status", "REST + mTLS")
    Rel(yandex, hopperru, "Organic traffic from travel queries", "HTTPS")
```

---

## Level 2: Container Diagram

Breaks down the HopperRU system into deployable containers.

```mermaid
C4Container
    title Container Diagram — HopperRU

    Person(traveler, "Traveler")

    System_Boundary(hopperru, "HopperRU Platform") {
        Container(web, "Web Application", "Next.js + React", "SSR/ISR pages for search, booking, account management. Responsive design.")
        Container(tgbot, "Telegram Bot", "Node.js + telegraf.js", "Conversational booking flow via inline keyboards. Price alerts and notifications.")
        Container(gateway, "API Gateway", "NestJS", "Authentication, rate limiting, request routing, response aggregation.")
        Container(search, "Search Service", "NestJS", "Flight and hotel search via external APIs. Result normalization and caching.")
        Container(prediction, "Prediction Service", "NestJS", "Orchestrates price predictions. Manages fallback from ML to rules.")
        Container(booking, "Booking Service", "NestJS", "Reservation lifecycle, payment orchestration via YooKassa, ticketing.")
        Container(fintech, "Fintech Service", "NestJS", "Price Freeze, CFAR, Price Drop Protection, Disruption Guarantee. Insurance partner integration.")
        Container(user, "User Service", "NestJS", "Authentication (JWT), profile management, watchlists, Carrot Cash.")
        Container(notification, "Notification Service", "NestJS", "Telegram push, email transactional, scheduled digests, WebSocket real-time.")
        Container(ml, "ML Service", "Python + FastAPI", "Price prediction model (scikit-learn Phase 1, TensorFlow Phase 2). Training pipeline.")

        ContainerDb(pg, "PostgreSQL", "PostgreSQL 16", "Users, bookings, payments, fintech products, routes. ACID transactional store.")
        ContainerDb(redis, "Redis", "Redis 7", "Search result cache, session store, rate limit counters, feature flags, BullMQ job queue.")
        ContainerDb(ch, "ClickHouse", "ClickHouse", "Historical price snapshots (billions of rows), search analytics, ML training data.")
    end

    System_Ext(airlines, "Airline APIs")
    System_Ext(hotels, "Hotel APIs")
    System_Ext(yookassa, "YooKassa")
    System_Ext(insurance, "Insurance Partner")
    System_Ext(telegram_api, "Telegram Bot API")

    Rel(traveler, web, "Uses", "HTTPS")
    Rel(traveler, tgbot, "Uses", "Telegram")

    Rel(web, gateway, "API calls", "HTTPS/JSON")
    Rel(tgbot, gateway, "API calls", "HTTP/JSON")

    Rel(gateway, search, "Routes search requests", "HTTP")
    Rel(gateway, prediction, "Routes prediction requests", "HTTP")
    Rel(gateway, booking, "Routes booking requests", "HTTP")
    Rel(gateway, fintech, "Routes fintech requests", "HTTP")
    Rel(gateway, user, "Routes auth/profile requests", "HTTP")
    Rel(gateway, notification, "Routes notification requests", "HTTP")

    Rel(search, airlines, "Queries flights", "REST/SOAP")
    Rel(search, hotels, "Queries hotels", "REST")
    Rel(search, redis, "Caches results", "Redis protocol")
    Rel(search, pg, "Stores search metadata", "TCP/SQL")

    Rel(prediction, ml, "Requests inference", "HTTP/JSON")
    Rel(prediction, redis, "Caches predictions", "Redis protocol")
    Rel(prediction, ch, "Reads historical data", "HTTP/SQL")

    Rel(booking, yookassa, "Processes payments", "REST + Webhooks")
    Rel(booking, airlines, "Creates PNRs", "REST/SOAP")
    Rel(booking, pg, "Stores bookings", "TCP/SQL")

    Rel(fintech, insurance, "Files claims", "REST + mTLS")
    Rel(fintech, pg, "Stores fintech products", "TCP/SQL")

    Rel(user, pg, "Stores user data", "TCP/SQL")
    Rel(user, redis, "Manages sessions", "Redis protocol")

    Rel(notification, telegram_api, "Sends messages", "HTTPS")
    Rel(notification, redis, "Job queue", "Redis protocol")

    Rel(ml, pg, "Reads route data", "TCP/SQL")
    Rel(ml, ch, "Reads training data", "HTTP/SQL")
```

---

## Level 3: Component Diagram — API Server (Gateway + Core Modules)

Breaks down the API Gateway and shows how NestJS modules interact.

```mermaid
C4Component
    title Component Diagram — API Gateway & Core Service Modules

    Container_Boundary(gateway, "API Gateway (NestJS)") {
        Component(auth_guard, "AuthGuard", "NestJS Guard", "Validates JWT tokens, extracts user context. Handles Telegram auth widget verification.")
        Component(rate_limiter, "RateLimiter", "NestJS Guard + Redis", "Per-user and per-IP throttling. Sliding window counter in Redis.")
        Component(router, "RequestRouter", "NestJS Controller", "Routes incoming requests to appropriate downstream service based on path prefix.")
        Component(aggregator, "ResponseAggregator", "NestJS Interceptor", "Combines responses from multiple services for dashboard/summary endpoints.")
        Component(validator, "InputValidator", "class-validator + class-transformer", "DTO validation, type coercion, sanitization for all incoming requests.")
        Component(error_handler, "GlobalExceptionFilter", "NestJS Filter", "Catches all exceptions, formats standardized error responses, logs errors.")
        Component(cors, "CorsMiddleware", "NestJS Middleware", "Whitelist-based CORS for web app and Telegram domains.")
    end

    Container_Boundary(auth_module, "AuthModule (User Service)") {
        Component(auth_controller, "AuthController", "NestJS Controller", "POST /auth/login, /auth/register, /auth/refresh, /auth/telegram")
        Component(auth_service, "AuthService", "NestJS Service", "Password hashing (bcrypt), JWT generation/validation, Telegram hash verification")
        Component(user_repo, "UserRepository", "Prisma", "CRUD operations on User entity, profile updates, account linking")
        Component(session_store, "SessionStore", "Redis", "Stores refresh tokens, manages token rotation and revocation")
    end

    Container_Boundary(search_module, "SearchModule") {
        Component(search_controller, "SearchController", "NestJS Controller", "GET /search/flights, /search/hotels with query parameters")
        Component(search_service, "SearchService", "NestJS Service", "Orchestrates multi-provider search, normalizes results, applies filters/sort")
        Component(airline_adapter, "AirlineAdapter", "NestJS Provider", "Adapts Amadeus/Sabre/direct API responses to internal flight model")
        Component(hotel_adapter, "HotelAdapter", "NestJS Provider", "Adapts hotel aggregator responses to internal hotel model")
        Component(search_cache, "SearchCache", "Redis", "Caches search results by route+date+filters hash, TTL 5-15 min")
    end

    Container_Boundary(prediction_module, "PredictionModule") {
        Component(pred_controller, "PredictionController", "NestJS Controller", "GET /predict/:routeId with date range")
        Component(pred_service, "PredictionService", "NestJS Service", "Calls ML service for inference, falls back to RuleEngine if unavailable")
        Component(rule_engine, "RuleEngine", "NestJS Provider", "Seasonality + day-of-week + advance-purchase heuristics for Phase 1 predictions")
        Component(ml_client, "MLServiceClient", "HTTP Client", "REST client to FastAPI ML microservice with circuit breaker")
    end

    Container_Boundary(booking_module, "BookingModule") {
        Component(book_controller, "BookingController", "NestJS Controller", "POST /bookings, GET /bookings/:id, PATCH /bookings/:id/cancel")
        Component(book_service, "BookingService", "NestJS Service", "Booking state machine: Draft -> Pending -> Confirmed -> Completed/Cancelled")
        Component(payment_service, "PaymentService", "NestJS Service", "YooKassa payment creation, webhook handling, idempotency, refund processing")
        Component(ticket_service, "TicketService", "NestJS Service", "PNR creation via airline API, e-ticket generation, itinerary storage")
    end

    Container_Boundary(fintech_module, "FintechModule") {
        Component(fintech_controller, "FintechController", "NestJS Controller", "POST /fintech/freeze, /fintech/cfar, /fintech/pdp, GET /fintech/:bookingId")
        Component(freeze_service, "PriceFreezeService", "NestJS Service", "Creates freeze, monitors expiry, applies frozen price at checkout")
        Component(cfar_service, "CFARService", "NestJS Service", "Creates CFAR policy via insurance partner, processes cancellation claims")
        Component(pdp_service, "PriceDropService", "NestJS Service", "Monitors price for 10 days post-booking, triggers automatic refund on drop")
        Component(insurance_client, "InsuranceClient", "HTTP Client", "REST + mTLS client to insurance partner API")
    end

    Container_Boundary(notification_module, "NotificationModule") {
        Component(notif_controller, "NotificationController", "NestJS Controller", "Internal API for triggering notifications from other services")
        Component(notif_service, "NotificationService", "NestJS Service", "Routes notifications to appropriate channel (Telegram, email, WebSocket)")
        Component(telegram_sender, "TelegramSender", "NestJS Provider", "Formats and sends Telegram messages via Bot API")
        Component(email_sender, "EmailSender", "NestJS Provider", "Transactional emails via SMTP (booking confirmations, receipts)")
        Component(scheduler, "NotificationScheduler", "BullMQ", "Cron-based jobs: weekly digest, price alert checks, freeze expiry reminders")
    end

    Rel(router, auth_guard, "Checks auth")
    Rel(router, rate_limiter, "Checks rate limit")
    Rel(router, validator, "Validates input")
    Rel(router, auth_controller, "/auth/*")
    Rel(router, search_controller, "/search/*")
    Rel(router, pred_controller, "/predict/*")
    Rel(router, book_controller, "/bookings/*")
    Rel(router, fintech_controller, "/fintech/*")
    Rel(router, notif_controller, "/notifications/*")
```

---

## Level 4: Code — PricePredictionEngine

Class diagram for the ML service's core prediction logic.

```mermaid
classDiagram
    class PredictionRouter {
        +FastAPI app
        +predict(request: PredictionRequest): PredictionResponse
        +health(): HealthResponse
        +retrain(trigger: RetrainTrigger): RetrainResponse
    }

    class PricePredictionEngine {
        -ModelRegistry model_registry
        -FeatureExtractor feature_extractor
        -ConfidenceCalibrator calibrator
        +predict(route_id: str, departure_date: date, lookahead_days: int): Prediction
        +get_model_info(): ModelInfo
    }

    class FeatureExtractor {
        -ClickHouseClient ch_client
        -Dict~str,Callable~ feature_fns
        +extract(route_id: str, departure_date: date): FeatureVector
        -compute_seasonality(date: date): float
        -compute_day_of_week(date: date): float
        -compute_advance_purchase(departure: date, today: date): float
        -compute_route_popularity(route_id: str): float
        -compute_historical_volatility(route_id: str): float
        -compute_competitor_price_index(route_id: str): float
    }

    class FeatureVector {
        +float seasonality_score
        +float day_of_week_score
        +int advance_purchase_days
        +float route_popularity
        +float price_volatility
        +float competitor_index
        +float current_price
        +float avg_price_30d
        +float min_price_30d
        +ndarray to_array()
    }

    class ModelRegistry {
        -str model_dir
        -Dict~str,BaseModel~ models
        +load_model(model_id: str): BaseModel
        +get_active_model(): BaseModel
        +register_model(model_id: str, model: BaseModel, metrics: Dict)
        +list_models(): List~ModelInfo~
    }

    class BaseModel {
        <<abstract>>
        +predict(features: FeatureVector): RawPrediction*
        +get_accuracy(): float*
        +get_version(): str*
    }

    class RuleBasedModel {
        -Dict~str,Rule~ rules
        +predict(features: FeatureVector): RawPrediction
        +get_accuracy(): float
        +get_version(): str
        -apply_seasonality_rule(features: FeatureVector): float
        -apply_advance_purchase_rule(features: FeatureVector): float
        -apply_volatility_rule(features: FeatureVector): float
    }

    class GradientBoostingModel {
        -GradientBoostingRegressor sklearn_model
        -StandardScaler scaler
        +predict(features: FeatureVector): RawPrediction
        +get_accuracy(): float
        +get_version(): str
        +train(training_data: DataFrame): TrainResult
    }

    class LSTMModel {
        -tf.keras.Model keras_model
        -MinMaxScaler scaler
        +predict(features: FeatureVector): RawPrediction
        +get_accuracy(): float
        +get_version(): str
        +train(time_series: DataFrame): TrainResult
    }

    class RawPrediction {
        +float predicted_price
        +float raw_confidence
        +str model_version
    }

    class ConfidenceCalibrator {
        -float min_confidence_threshold
        -Dict~str,float~ route_calibration
        +calibrate(raw: RawPrediction, route_id: str): CalibratedPrediction
        -apply_data_volume_penalty(confidence: float, sample_count: int): float
        -apply_recency_boost(confidence: float, last_data_age_hours: int): float
    }

    class CalibratedPrediction {
        +float predicted_price
        +float confidence
        +str recommendation
        +int wait_days
        +float potential_savings
    }

    class Prediction {
        +str route_id
        +date departure_date
        +float current_price
        +float predicted_price
        +float confidence
        +str recommendation
        +int wait_days
        +float potential_savings
        +str model_version
        +datetime valid_until
    }

    class TrainingPipeline {
        -ClickHouseClient ch_client
        -ModelRegistry registry
        -str output_dir
        +run_training(model_type: str, params: Dict): TrainResult
        -fetch_training_data(lookback_days: int): DataFrame
        -validate_model(model: BaseModel, test_data: DataFrame): ValidationResult
        -promote_if_better(new_model: BaseModel, metrics: Dict): bool
    }

    class TrainResult {
        +str model_id
        +float accuracy
        +float mae
        +float rmse
        +int training_samples
        +float training_duration_sec
        +bool promoted
    }

    PredictionRouter --> PricePredictionEngine
    PricePredictionEngine --> ModelRegistry
    PricePredictionEngine --> FeatureExtractor
    PricePredictionEngine --> ConfidenceCalibrator
    FeatureExtractor --> FeatureVector
    ModelRegistry --> BaseModel
    BaseModel <|-- RuleBasedModel
    BaseModel <|-- GradientBoostingModel
    BaseModel <|-- LSTMModel
    BaseModel --> RawPrediction
    ConfidenceCalibrator --> CalibratedPrediction
    PricePredictionEngine --> Prediction
    PredictionRouter --> TrainingPipeline
    TrainingPipeline --> ModelRegistry
    TrainingPipeline --> TrainResult
```

### Class Responsibilities

| Class | Responsibility |
|-------|---------------|
| `PredictionRouter` | FastAPI endpoint handler. Validates requests, delegates to engine, serializes responses. |
| `PricePredictionEngine` | Core orchestrator. Extracts features, selects model, runs inference, calibrates confidence. |
| `FeatureExtractor` | Computes ML features from raw data. Queries ClickHouse for historical prices, computes derived metrics. |
| `FeatureVector` | Immutable data class holding all features for a single prediction request. |
| `ModelRegistry` | Manages model lifecycle: loading from disk, versioning, A/B selection of active model. |
| `BaseModel` | Abstract base class defining the prediction interface. All models implement `predict()`. |
| `RuleBasedModel` | Phase 1 model. Hand-crafted rules for seasonality, advance purchase, volatility. Target: 70% accuracy. |
| `GradientBoostingModel` | Phase 2 model. scikit-learn gradient boosting trained on accumulated price data. Target: 85% accuracy. |
| `LSTMModel` | Phase 3 model. TensorFlow LSTM for time-series price prediction. Target: 95% accuracy. |
| `ConfidenceCalibrator` | Post-processes raw model confidence. Applies penalties for low data volume, boosts for fresh data. |
| `TrainingPipeline` | Batch training orchestrator. Fetches data, trains model, validates, promotes if metrics improve. |
