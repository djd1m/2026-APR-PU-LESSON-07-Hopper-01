from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """ML service configuration loaded from environment variables."""

    # Service
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    log_level: str = "info"

    # Database (read-only access to price history)
    database_url: str = "postgresql://hopperru:hopperru@localhost:5432/hopperru"

    # Redis (for caching predictions)
    redis_url: str = "redis://localhost:6379/1"
    prediction_cache_ttl_seconds: int = 3600  # 1 hour

    # Model settings
    model_version: str = "rule-v1"
    confidence_cap: float = 0.70  # Max confidence for rule-based model
    ml_min_data_points: int = 1000  # Min data points to use ML model

    # API (internal)
    api_base_url: str = "http://localhost:3000/api/v1"
    internal_api_key: str = ""

    class Config:
        env_prefix = "ML_"
        env_file = ".env"


settings = Settings()
