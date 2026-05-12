"""
PricePredictionEngine — rule-based price prediction for Russian flights.

Implements the algorithm from docs/Pseudocode.md section 2.1.
MVP target: ~70% directional accuracy using 6 factors:
  1. Advance purchase curve (days until departure)
  2. Day of week
  3. Seasonality (month-based)
  4. Holiday proximity
  5. Historical price trend (stub — requires price history DB)
  6. Competitor pricing position (stub — requires aggregator data)
"""

from datetime import date, timedelta

from schemas import (
    PredictionFactor,
    PredictionRequest,
    PredictionResponse,
    PriceDirection,
    Recommendation,
)
from models.rules import (
    SEASONAL_FACTORS,
    DAY_OF_WEEK_FACTORS,
    HOLIDAY_DESTINATIONS,
    HOLIDAY_PROXIMITY_FACTOR,
    get_advance_purchase_factor,
    get_nearest_holiday,
)
from config import settings


class PricePredictionEngine:
    """
    Rule-based prediction engine (model_version: "rule-v1").

    Each factor contributes a signed float to the cumulative score:
      score > +0.15  ->  BUY_NOW  (prices going UP)
      score < -0.15  ->  WAIT     (prices going DOWN)
      else           ->  BUY_NOW  (stable; default to buy when uncertain)

    Confidence is capped at 70% for rule-based predictions.
    """

    def __init__(self) -> None:
        self.model_version = settings.model_version
        self.confidence_cap = settings.confidence_cap

    def predict(self, request: PredictionRequest) -> PredictionResponse:
        """
        Main prediction entry point.
        Dispatches to rule_based_predict (MVP) or ml_predict (future).
        """
        # TODO: Check historical data point count; if >= ml_min_data_points
        # and feature flag enabled, use ML model instead.
        return self.rule_based_predict(request)

    def rule_based_predict(self, request: PredictionRequest) -> PredictionResponse:
        """
        Rule-based prediction following Pseudocode.md section 2.1.
        """
        today = date.today()
        departure = request.departure_date
        current_price = request.current_price

        factors: list[PredictionFactor] = []
        score = 0.0

        # ── Factor 1: Advance purchase curve ──
        days_out = (departure - today).days
        if days_out < 0:
            # Departure in the past
            return PredictionResponse(
                recommendation=Recommendation.NO_DATA,
                confidence=0.0,
                direction=PriceDirection.STABLE,
                explanation="Дата вылета уже прошла.",
                model_version=self.model_version,
                factors=[],
            )

        adv_factor, adv_label = get_advance_purchase_factor(days_out)
        score += adv_factor
        factors.append(PredictionFactor(
            name="advance_purchase",
            weight=adv_factor,
            value=adv_label,
            direction=PriceDirection.UP if adv_factor > 0 else PriceDirection.DOWN,
        ))

        # ── Factor 2: Day of week ──
        dow = departure.weekday()  # Monday=0
        dow_factor = DAY_OF_WEEK_FACTORS.get(dow, 0.0)
        if dow_factor != 0.0:
            score += dow_factor
            dow_names = ["monday", "tuesday", "wednesday", "thursday",
                         "friday", "saturday", "sunday"]
            factors.append(PredictionFactor(
                name="day_of_week",
                weight=dow_factor,
                value=dow_names[dow],
                direction=PriceDirection.UP if dow_factor > 0 else PriceDirection.DOWN,
            ))

        # ── Factor 3: Seasonality ──
        month = departure.month
        season_factor = SEASONAL_FACTORS.get(month, 0.0)
        if season_factor != 0.0:
            score += season_factor
            factors.append(PredictionFactor(
                name="seasonality",
                weight=season_factor,
                value=f"month_{month}",
                direction=PriceDirection.UP if season_factor > 0 else PriceDirection.DOWN,
            ))

        # ── Factor 4: Holiday proximity ──
        holiday = get_nearest_holiday(departure)
        if holiday is not None:
            holiday_name, days_to_holiday = holiday
            # Extra boost for popular holiday destinations
            factor = HOLIDAY_PROXIMITY_FACTOR
            if request.destination in HOLIDAY_DESTINATIONS:
                factor += 0.10

            score += factor
            factors.append(PredictionFactor(
                name="holiday",
                weight=factor,
                value=holiday_name,
                direction=PriceDirection.UP,
            ))

        # ── Factor 5: Historical price trend (stub) ──
        # TODO: Query PriceHistory table for 7-day trend.
        # When implemented:
        #   trend = get_price_trend(route, departure, window=7)
        #   if trend.direction == UP and trend.magnitude > 5%: score += 0.2
        #   if trend.direction == DOWN and trend.magnitude > 5%: score -= 0.2

        # ── Factor 6: Competitor pricing position (stub) ──
        # TODO: Compare current_price against competitor prices.
        # When implemented:
        #   if current_price < percentile(competitors, 25): score += 0.1
        #   if current_price > percentile(competitors, 75): score -= 0.1

        # ── Calculate prediction ──
        confidence = min(self.confidence_cap, 0.5 + abs(score) * 0.3)

        if score > 0.15:
            direction = PriceDirection.UP
            recommendation = Recommendation.BUY_NOW
            explanation = self._format_explanation_buy(factors, confidence)
            predicted_change_pct = round(score * 10, 1)  # rough estimate
            predicted_price = round(current_price * (1 + predicted_change_pct / 100), 2)
            expected_savings = None
            wait_days = None
        elif score < -0.15:
            direction = PriceDirection.DOWN
            recommendation = Recommendation.WAIT
            wait_days = self._estimate_wait_days(score, days_out)
            savings_pct = min(0.30, abs(score) * 0.15)
            expected_savings = round(current_price * savings_pct, 2)
            predicted_change_pct = round(score * 10, 1)
            predicted_price = round(current_price * (1 + predicted_change_pct / 100), 2)
            explanation = self._format_explanation_wait(
                factors, confidence, wait_days, expected_savings
            )
        else:
            direction = PriceDirection.STABLE
            recommendation = Recommendation.BUY_NOW
            predicted_change_pct = 0.0
            predicted_price = current_price
            expected_savings = None
            wait_days = None
            explanation = "Цена стабильна. Существенных изменений не ожидается."

        return PredictionResponse(
            recommendation=recommendation,
            confidence=round(confidence, 3),
            predicted_price=predicted_price,
            predicted_change_pct=predicted_change_pct,
            direction=direction,
            expected_savings=expected_savings,
            wait_days=wait_days,
            explanation=explanation,
            model_version=self.model_version,
            factors=factors,
        )

    # ── Helpers ──

    @staticmethod
    def _estimate_wait_days(score: float, days_out: int) -> int:
        """Estimate how many days the user should wait before buying."""
        if days_out > 30:
            return min(7, round(abs(score) * 10))
        elif days_out > 14:
            return min(3, round(abs(score) * 5))
        else:
            return 1  # Very close to departure

    @staticmethod
    def _format_explanation_buy(
        factors: list[PredictionFactor], confidence: float
    ) -> str:
        """Generate Russian-language explanation for BUY_NOW recommendation."""
        reasons: list[str] = []

        for f in factors:
            if f.direction == PriceDirection.UP:
                if f.name == "advance_purchase":
                    if "last_minute" in f.value:
                        reasons.append("до вылета менее недели — цены на максимуме")
                    else:
                        reasons.append("до вылета менее 3 недель — цены растут")
                elif f.name == "day_of_week":
                    reasons.append("вылет в пятницу/воскресенье — пиковый спрос")
                elif f.name == "seasonality":
                    reasons.append("высокий сезон — повышенный спрос на перелёты")
                elif f.name == "holiday":
                    reasons.append(f"приближаются праздники ({f.value})")

        if not reasons:
            return "Рекомендуем купить сейчас — цена вряд ли снизится."

        conf_pct = round(confidence * 100)
        return (
            f"Рекомендуем купить сейчас (уверенность {conf_pct}%): "
            + "; ".join(reasons) + "."
        )

    @staticmethod
    def _format_explanation_wait(
        factors: list[PredictionFactor],
        confidence: float,
        wait_days: int,
        expected_savings: float,
    ) -> str:
        """Generate Russian-language explanation for WAIT recommendation."""
        reasons: list[str] = []

        for f in factors:
            if f.direction == PriceDirection.DOWN:
                if f.name == "advance_purchase":
                    reasons.append("до вылета ещё далеко — цены обычно снижаются")
                elif f.name == "day_of_week":
                    reasons.append("вылет во вторник/среду — исторически самые низкие цены")
                elif f.name == "seasonality":
                    reasons.append("низкий сезон — спрос ниже обычного")

        if not reasons:
            return "Рекомендуем подождать — есть шанс на снижение цены."

        conf_pct = round(confidence * 100)
        savings_fmt = f"{expected_savings:,.0f}".replace(",", " ")
        return (
            f"Рекомендуем подождать {wait_days} дн. (уверенность {conf_pct}%): "
            + "; ".join(reasons)
            + f". Потенциальная экономия: ~{savings_fmt} ₽."
        )


# Singleton instance
prediction_engine = PricePredictionEngine()
