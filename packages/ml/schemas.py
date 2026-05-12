from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class PriceDirection(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    STABLE = "STABLE"


class Recommendation(str, Enum):
    BUY_NOW = "BUY_NOW"
    WAIT = "WAIT"
    NO_DATA = "NO_DATA"


class PredictionFactor(BaseModel):
    """Individual factor that influenced the prediction."""
    name: str
    weight: float
    value: str
    direction: PriceDirection


class PredictionRequest(BaseModel):
    """Request body for /predict endpoint."""
    origin: str = Field(..., min_length=2, max_length=4, description="Origin airport IATA code")
    destination: str = Field(..., min_length=2, max_length=4, description="Destination airport IATA code")
    departure_date: date = Field(..., description="Departure date (YYYY-MM-DD)")
    current_price: float = Field(..., gt=0, description="Current observed price in RUB")


class PredictionResponse(BaseModel):
    """Response from /predict endpoint."""
    recommendation: Recommendation
    confidence: float = Field(..., ge=0.0, le=1.0)
    predicted_price: Optional[float] = Field(None, description="Predicted future price in RUB")
    predicted_change_pct: Optional[float] = Field(None, description="Predicted price change as percentage")
    direction: PriceDirection
    expected_savings: Optional[float] = Field(None, description="Expected savings in RUB if user waits")
    wait_days: Optional[int] = Field(None, description="Recommended days to wait")
    explanation: str = Field(..., description="Human-readable explanation in Russian")
    model_version: str
    factors: list[PredictionFactor] = Field(default_factory=list)


class RetrainRequest(BaseModel):
    """Request body for /retrain endpoint."""
    model_type: str = Field(default="rule-v1", description="Model type to retrain")
    # TODO: Add parameters for ML model retraining (epochs, learning rate, etc.)


class RetrainResponse(BaseModel):
    """Response from /retrain endpoint."""
    status: str
    model_version: str
    message: str


class HealthResponse(BaseModel):
    """Response from /health endpoint."""
    status: str
    version: str
    model_version: str
