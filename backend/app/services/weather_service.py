"""
services/weather_service.py — Meteorological data service using Open-Meteo API.
Retrieves hourly weather observations and forecasts for the Pune Urban Airshed.
"""
import time
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import requests

from backend.app.config import settings
from backend.app.utils.logging import logger
from backend.app.database import get_db_context
from backend.app.models.weather import WeatherMeasurement

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
PUNE_LAT = 18.5204
PUNE_LON = 73.8567


class WeatherService:
    def __init__(self):
        self.cache_file = settings.CACHE_DIR / "weather_pune_cache.json"

    def fetch_pune_weather(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetches current and 24h forecasted weather conditions for Pune.
        Cached for 1 hour to respect API rate limits.
        """
        if not force_refresh and self._is_cache_fresh():
            cached = self._read_cache()
            if cached:
                return cached

        params = {
            "latitude": PUNE_LAT,
            "longitude": PUNE_LON,
            "current": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "wind_direction_10m", "precipitation"],
            "hourly": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "wind_direction_10m", "precipitation"],
            "timezone": "Asia/Kolkata",
            "forecast_days": 2,
        }

        try:
            resp = requests.get(OPEN_METEO_URL, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                result = {
                    "timestamp": current.get("time", datetime.now().isoformat()),
                    "latitude": PUNE_LAT,
                    "longitude": PUNE_LON,
                    "temperature": current.get("temperature_2m", 28.5),
                    "humidity": current.get("relative_humidity_2m", 58.0),
                    "wind_speed": current.get("wind_speed_10m", 8.4),
                    "wind_direction": current.get("wind_direction_10m", 240.0),
                    "pressure": current.get("surface_pressure", 1012.0),
                    "precipitation": current.get("precipitation", 0.0),
                    "boundary_layer_height": self._estimate_blh(
                        current.get("temperature_2m", 28.5),
                        current.get("wind_speed_10m", 8.4)
                    ),
                    "source": "Open-Meteo (ERA5 Reanalysis / GFS)",
                    "data_status": "OBSERVED",
                }
                self._write_cache(result)
                return result
            else:
                logger.warning(f"[WeatherService] Open-Meteo returned status {resp.status_code}")
        except Exception as e:
            logger.warning(f"[WeatherService] Open-Meteo query failed: {e}")

        # Fallback to calibrated Pune seasonal climatology
        return self._get_fallback_weather()

    def sync_to_database(self) -> bool:
        """Stores the latest weather observation in the database."""
        weather = self.fetch_pune_weather()
        try:
            with get_db_context() as db:
                ts = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
                existing = db.query(WeatherMeasurement).filter(
                    WeatherMeasurement.latitude == PUNE_LAT,
                    WeatherMeasurement.longitude == PUNE_LON,
                    WeatherMeasurement.timestamp == ts
                ).first()

                if not existing:
                    wm = WeatherMeasurement(
                        timestamp=ts,
                        latitude=PUNE_LAT,
                        longitude=PUNE_LON,
                        temperature=weather["temperature"],
                        humidity=weather["humidity"],
                        wind_speed=weather["wind_speed"],
                        wind_direction=weather["wind_direction"],
                        pressure=weather["pressure"],
                        precipitation=weather["precipitation"],
                        boundary_layer_height=weather["boundary_layer_height"],
                    )
                    db.add(wm)
                    logger.info("[WeatherService] Weather measurement persisted to DB.")
                return True
        except Exception as e:
            logger.error(f"[WeatherService] Failed to sync weather to DB: {e}")
            return False

    def _estimate_blh(self, temp: float, wind: float) -> float:
        """Estimates atmospheric Boundary Layer Height (m) based on diurnal heating and surface wind."""
        hour = (datetime.now().hour + 5) % 24  # IST approx
        if 6 <= hour <= 18:
            # Daytime convective boundary layer (rises up to 1200-2000m)
            peak_factor = 1.0 - abs(hour - 13) / 7.0
            blh = 400 + 1200 * max(0.0, peak_factor) + (temp * 15) + (wind * 20)
        else:
            # Nocturnal stable boundary layer (shallow: 150-400m, trapping emissions)
            blh = 200 + (wind * 15)
        return round(min(2800.0, max(150.0, blh)), 1)

    def _is_cache_fresh(self) -> bool:
        if not self.cache_file.exists():
            return False
        return (time.time() - self.cache_file.stat().st_mtime) < 3600  # 1 hr cache

    def _read_cache(self) -> Optional[Dict[str, Any]]:
        try:
            with open(self.cache_file, "r") as f:
                return json.load(f)
        except Exception:
            return None

    def _write_cache(self, data: Dict[str, Any]):
        try:
            with open(self.cache_file, "w") as f:
                json.dump(data, f)
        except Exception:
            pass

    def _get_fallback_weather(self) -> Dict[str, Any]:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": PUNE_LAT,
            "longitude": PUNE_LON,
            "temperature": 27.8,
            "humidity": 54.0,
            "wind_speed": 7.2,
            "wind_direction": 250.0,
            "pressure": 1012.4,
            "precipitation": 0.0,
            "boundary_layer_height": 650.0,
            "source": "Pune Climatological Reference",
            "data_status": "REFERENCE",
        }


weather_service = WeatherService()
