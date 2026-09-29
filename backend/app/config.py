"""
config.py — Central configuration management for AYAM Urban Environmental Digital Twin.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
env_paths = [
    PROJECT_ROOT / ".env",
    PROJECT_ROOT / "backend" / ".env",
    PROJECT_ROOT / "frontend" / ".env.local"
]
for p in env_paths:
    if p.exists():
        load_dotenv(p, override=False)


class Settings:
    # Application & Environment
    APP_NAME: str = "AYAM — Atmospheric & Urban Analytics Model"
    APP_MODE: str = os.getenv("APP_MODE", "demo")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # Supabase & Database
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{PROJECT_ROOT}/urban_twin.db"
    )

    # External APIs
    OPENAQ_API_KEY: str = os.getenv("OPENAQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    MAPTILER_API_KEY: str = os.getenv("MAPTILER_API_KEY", os.getenv("VITE_MAPTILER_KEY", os.getenv("NEXT_PUBLIC_MAPTILER_KEY", "")))
    TOMTOM_API_KEY: str = os.getenv("TOMTOM_API_KEY", "")

    # Storage & Cache
    CACHE_DIR: Path = PROJECT_ROOT / "data" / "raw"
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "21600"))

    # File Paths
    PROJECT_ROOT_PATH: Path = PROJECT_ROOT
    BACKEND_ROOT_PATH: Path = PROJECT_ROOT / "backend"
    ML_ARTIFACTS_DIR: Path = PROJECT_ROOT / "ml" / "artifacts"
    BACKEND_ML_DIR: Path = PROJECT_ROOT / "backend" / "ml" / "models"
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
        return bool(self.OPENAQ_API_KEY and self.OPENAQ_API_KEY != "your_openaq_api_key_here")

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY != "your_gemini_api_key_here")

    @property
    def has_maptiler(self) -> bool:
        return bool(self.MAPTILER_API_KEY and self.MAPTILER_API_KEY != "your_maptiler_api_key_here")

    @property
    def has_supabase(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY)


settings = Settings()
