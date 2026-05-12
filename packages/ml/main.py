"""
HopperRU ML Service — FastAPI application.

Endpoints:
  GET  /health   — Service health check
  POST /predict  — Price prediction for a flight route
  POST /retrain  — Trigger model retraining (placeholder)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import (
    HealthResponse,
    PredictionRequest,
    PredictionResponse,
    RetrainRequest,
    RetrainResponse,
)
from models.predictor import prediction_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown logic."""
    # Startup
    # TODO: Initialize DB connection pool for price history queries
    # TODO: Initialize Redis client for prediction caching
    # TODO: Load ML model weights if available
    print(f"[ml] Starting ML service (model: {settings.model_version})")
    yield
    # Shutdown
    print("[ml] Shutting down ML service")


app = FastAPI(
    title="HopperRU ML Service",
    description="AI-powered flight price prediction for the Russian market",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow internal services
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to internal service URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Service health check."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        model_version=settings.model_version,
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest) -> PredictionResponse:
    """
    Predict flight price direction and recommend action.

    Uses rule-based engine (rule-v1) for MVP. Will automatically
    switch to ML model when sufficient historical data is available.
    """
    try:
        prediction = prediction_engine.predict(request)
        # TODO: Cache prediction in Redis
        # TODO: Log prediction for accuracy tracking
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/retrain", response_model=RetrainResponse)
async def retrain(request: RetrainRequest) -> RetrainResponse:
    """
    Trigger model retraining.

    Currently a placeholder — rule-based model doesn't need retraining.
    Will be implemented for ML model (v2) with scikit-learn pipeline.
    """
    # TODO: Implement ML model retraining pipeline:
    #   1. Fetch historical price data from DB
    #   2. Extract features (days_out, dow, month, holiday_dist, trend, etc.)
    #   3. Train GradientBoostingClassifier or similar
    #   4. Evaluate on holdout set (target: 85% accuracy)
    #   5. Save model weights to /models/ directory
    #   6. Hot-reload model in prediction_engine
    return RetrainResponse(
        status="skipped",
        model_version=settings.model_version,
        message="Rule-based model (rule-v1) does not require retraining. "
                "ML model retraining will be available in v2.",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level,
    )
