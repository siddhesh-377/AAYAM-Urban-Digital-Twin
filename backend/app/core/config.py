"""
config.py — Application configuration with environment variable support.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env if present
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
env_path = PROJECT_ROOT / ".env"
if env_path.exists():
    load_dotenv(env_path)

class Settings:
    # Application
    APP_MODE: str = os.getenv("APP_MODE", "demo")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # API Keys
    OPENAQ_API_KEY: str = os.getenv("OPENAQ_API_KEY", "")
    TOMTOM_API_KEY: str = os.getenv("TOMTOM_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{PROJECT_ROOT}/urban_twin.db"
    )

    # Cache
    CACHE_DIR: str = os.getenv("CACHE_DIR", str(PROJECT_ROOT / "data" / "raw"))
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "21600"))

    # Paths
    SYNTHETIC_DATA_PATH: Path = PROJECT_ROOT / "data" / "raw" / "openaq" / "pune_pm25_synthetic.parquet"
    MODEL_PATH: Path = PROJECT_ROOT / "ml" / "artifacts" / "model_c_xgb.json"
    TRAINING_REPORT_PATH: Path = PROJECT_ROOT / "ml" / "artifacts" / "training_report.json"
    TEST_PREDICTIONS_PATH: Path = PROJECT_ROOT / "ml" / "artifacts" / "test_predictions.parquet"
    GLOBAL_SHAP_PATH: Path = PROJECT_ROOT / "ml" / "artifacts" / "global_shap.json"
    STATION_SHAP_PATH: Path = PROJECT_ROOT / "ml" / "artifacts" / "station_shap.json"
    SCENARIO_PATH: Path = PROJECT_ROOT / "ml" / "artifacts" / "scenario_comparison.json"
    MPCB_PATH: Path = PROJECT_ROOT / "data" / "reference" / "mpcb_source_apportionment.json"
    TEST_FEATURES_PATH: Path = PROJECT_ROOT / "data" / "features" / "test_features.parquet"

    @property
    def is_demo(self) -> bool:
        return self.APP_MODE.lower() == "demo"

    @property
    def has_openaq(self) -> bool:
        return bool(self.OPENAQ_API_KEY)

    @property
    def has_tomtom(self) -> bool:
        return bool(self.TOMTOM_API_KEY)

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY)


settings = Settings()
