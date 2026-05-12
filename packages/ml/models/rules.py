"""
Rule-based prediction constants for the Russian travel market.

These factors encode domain knowledge about Russian domestic and popular
international flight pricing patterns. They serve as the foundation for
the MVP rule-based prediction engine (model_version: "rule-v1").
"""

from datetime import date


# --------------------------------------------------------------------------
# Factor 1: Seasonal pricing factors by month
# Positive = prices tend to be HIGHER than average
# Negative = prices tend to be LOWER than average
# --------------------------------------------------------------------------
SEASONAL_FACTORS: dict[int, float] = {
    1: +0.15,   # January — New Year holidays, high demand
    2: -0.10,   # February — post-holiday lull
    3: -0.05,   # March — low season, 8 March bump
    4: -0.05,   # April — shoulder season
    5: +0.05,   # May — May holidays (1st, 9th), moderate demand
    6: +0.20,   # June — summer season begins, school holidays
    7: +0.30,   # July — peak summer, highest demand
    8: +0.25,   # August — still peak summer
    9: +0.00,   # September — shoulder, back to school
    10: -0.10,  # October — low season
    11: -0.15,  # November — lowest demand
    12: +0.10,  # December — pre-New Year travel, corporate events
}


# --------------------------------------------------------------------------
# Factor 2: Day-of-week pricing factors
# Monday=0, Sunday=6 (Python weekday convention)
# --------------------------------------------------------------------------
DAY_OF_WEEK_FACTORS: dict[int, float] = {
    0: +0.00,   # Monday — neutral
    1: -0.15,   # Tuesday — historically cheapest
    2: -0.15,   # Wednesday — historically cheapest
    3: +0.00,   # Thursday — neutral
    4: +0.15,   # Friday — weekend premium, business travel
    5: +0.05,   # Saturday — moderate
    6: +0.15,   # Sunday — return travel premium
}


# --------------------------------------------------------------------------
# Factor 3: Advance purchase curve
# Maps (min_days_out, max_days_out) -> factor
# Positive = prices likely going UP (buy now)
# Negative = prices likely going DOWN (wait)
# --------------------------------------------------------------------------
ADVANCE_PURCHASE_CURVE: list[tuple[int, int, float, str]] = [
    # (min_days, max_days, factor, label)
    (0, 6, +0.50, "last_minute"),       # Last minute — max premium
    (7, 20, +0.30, "7-21_days"),        # Prices actively rising
    (21, 60, -0.10, "21-60_days"),      # Sweet spot for most routes
    (61, 999, -0.20, "60+_days"),       # Far out — prices usually drop further
]


def get_advance_purchase_factor(days_out: int) -> tuple[float, str]:
    """Return (factor, label) for the given days until departure."""
    for min_d, max_d, factor, label in ADVANCE_PURCHASE_CURVE:
        if min_d <= days_out <= max_d:
            return factor, label
    return 0.0, "unknown"


# --------------------------------------------------------------------------
# Factor 4: Russian holiday calendar
# Dates that cause price spikes on nearby departure dates.
# Stored as (month, day, name, duration_days).
# If departure is within 14 days before or during a holiday, apply +0.25.
# --------------------------------------------------------------------------
HOLIDAY_CALENDAR_RU: list[tuple[int, int, str, int]] = [
    (1, 1, "Новогодние каникулы", 8),        # Jan 1-8
    (2, 23, "День защитника Отечества", 1),   # Feb 23
    (3, 8, "Международный женский день", 1),   # Mar 8
    (5, 1, "Праздник Весны и Труда", 1),       # May 1
    (5, 9, "День Победы", 1),                  # May 9
    (6, 12, "День России", 1),                 # Jun 12
    (11, 4, "День народного единства", 1),     # Nov 4
]

# Popular holiday destinations that see extra demand
HOLIDAY_DESTINATIONS: set[str] = {
    "AER",  # Сочи
    "AYT",  # Анталья
    "IST",  # Стамбул
    "LED",  # Санкт-Петербург
    "SIP",  # Симферополь
    "KRR",  # Краснодар
    "MRV",  # Минеральные Воды
}

HOLIDAY_PROXIMITY_FACTOR = +0.25
HOLIDAY_PROXIMITY_DAYS = 14


def get_nearest_holiday(departure: date) -> tuple[str, int] | None:
    """
    Find the nearest upcoming holiday relative to departure date.
    Returns (holiday_name, days_until_holiday) or None.
    """
    year = departure.year

    nearest: tuple[str, int] | None = None
    min_dist = float("inf")

    for month, day, name, duration in HOLIDAY_CALENDAR_RU:
        try:
            holiday_start = date(year, month, day)
        except ValueError:
            continue

        # Check both this year and next year (for Dec->Jan wrap)
        for h_date in [holiday_start, holiday_start.replace(year=year + 1)]:
            delta = (h_date - departure).days
            # We care about holidays coming up (within 14 days) or currently active
            if -duration <= delta <= HOLIDAY_PROXIMITY_DAYS:
                dist = abs(delta)
                if dist < min_dist:
                    min_dist = dist
                    nearest = (name, delta)

    return nearest
