# Feature: AI Price Prediction (Rule-Based Phase 1)

**ID:** price-prediction
**Priority:** mvp
**Epic:** E1
**Status:** Done
**Branch:** feature/003-price-prediction
**Stories:** US-02, US-03

## Overview

AI-powered price prediction engine that provides Buy Now / Wait recommendations with confidence scores for flight routes. Phase 1 uses a rule-based model (rule-v1) with 6 pricing factors specific to the Russian travel market. The ML microservice (FastAPI/Python) is deployed separately and the NestJS API proxies requests with a rule-based fallback.

## Architecture Decision

- **Separate ML microservice:** Python FastAPI service (`packages/ml/`) for prediction logic, called via HTTP from NestJS API. Enables independent scaling and Python ML ecosystem access.
- **Rule-based MVP (rule-v1):** 6-factor scoring model targeting ~70% directional accuracy. Factors: advance purchase curve, day of week, seasonality, holiday proximity, historical trend (stub), competitor pricing (stub).
- **Confidence cap at 70%:** Rule-based model explicitly caps confidence to set user expectations; ML model (v2) will remove this cap.
- **Russian market calibration:** Seasonal factors, holiday calendar (New Year, May holidays, etc.), and popular destination weighting tuned for Russian domestic travel patterns.

## Implementation

### Files Changed

- `packages/api/src/prediction/prediction.service.ts` -- NestJS service with ML service call + rule-based fallback
- `packages/api/src/prediction/prediction.controller.ts` -- REST endpoint with Swagger docs
- `packages/api/src/prediction/prediction.module.ts` -- NestJS module
- `packages/ml/main.py` -- FastAPI application with /predict, /retrain, /health endpoints
- `packages/ml/models/predictor.py` -- PricePredictionEngine class with rule-based scoring algorithm
- `packages/ml/models/rules.py` -- Russian market pricing constants: seasonal factors, DOW factors, advance purchase curve, holiday calendar
- `packages/ml/schemas.py` -- Pydantic request/response models
- `packages/ml/config.py` -- Service configuration
- `packages/web/src/components/PredictionBadge.tsx` -- Visual recommendation badge (green/yellow)

### Key Components

- **PredictionService (NestJS)** -- Proxies to ML microservice with 6-hour Redis cache; falls back to inline rule-based stub when ML service is unavailable
- **PricePredictionEngine (Python)** -- Core scoring engine: score > +0.15 = BUY_NOW, score < -0.15 = WAIT, else BUY_NOW (default to buy when uncertain)
- **Rules module** -- SEASONAL_FACTORS (Jan +15% to Nov -15%), DAY_OF_WEEK_FACTORS (Tue/Wed cheapest), ADVANCE_PURCHASE_CURVE (0-6 days +50%, 21-60 days -10%), HOLIDAY_CALENDAR_RU (7 Russian holidays)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/predict?route=SVO-AER&date=2026-07-15` | No | Get price prediction with recommendation and factors |

### ML Service Endpoints (internal)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Internal | Service health check |
| POST | `/predict` | Internal | Price prediction |
| POST | `/retrain` | Internal | Trigger model retraining (placeholder) |

## Data Model

- **PricePrediction** -- origin, destination, departure_date, predicted_price, confidence, recommendation (BUY_NOW/WAIT/INSUFFICIENT_DATA), predicted_change_pct, valid_until, model_version
- **PriceHistory** -- Used for trend analysis (Factor 5, currently stub)

## Dependencies

- **search-flights** -- Requires flight data for current pricing

## Testing

1. `GET /predict?route=SVO-AER&date=2026-07-15` should return prediction with recommendation, confidence (0-0.7), direction, and factors array
2. ML service: `POST /predict` with origin, destination, departure_date, current_price should return PredictionResponse
3. Verify last-minute flights (0-6 days) consistently recommend BUY_NOW
4. Verify far-out flights (60+ days) on Tue/Wed in November recommend WAIT
5. Verify holiday proximity boosts for popular destinations (AER, LED, KRR)
6. Verify confidence never exceeds 70% for rule-v1 model

## Notes

- ML service retraining endpoint is a placeholder; rule-v1 does not require retraining
- Future v2 will use scikit-learn GradientBoostingClassifier trained on PriceHistory data (target: 85% accuracy)
- Factor 5 (historical price trend) and Factor 6 (competitor pricing) are stubs pending PriceHistory data accumulation
- Predictions are cached for 6 hours in Redis
- Russian-language explanations are generated dynamically based on active factors
