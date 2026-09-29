"""
scripts/generate_sample_data.py — Generates calibrated sample/demo data for Pune.
Strictly labeled as [SAMPLE/DEMO] or [SYNTHETIC]. Never presented as live physical observations.
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.utils.logging import logger

SAMPLE_DIR = PROJECT_ROOT / "backend" / "data" / "sample"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)


def generate_sample_dataset():
    logger.info("Generating calibrated Pune sample dataset (marked DEMO/SAMPLE)...")

    stations = [
        {"id": "DEMO-SHIVAJINAGAR", "name": "Shivajinagar", "lat": 18.5314, "lon": 73.8446, "base": 88.5},
        {"id": "DEMO-HADAPSAR", "name": "Hadapsar", "lat": 18.5089, "lon": 73.9260, "base": 118.2},
        {"id": "DEMO-BHOSARI", "name": "Bhosari (PCMC)", "lat": 18.6279, "lon": 73.8437, "base": 138.0},
        {"id": "DEMO-KATRAJ", "name": "Katraj", "lat": 18.4575, "lon": 73.8677, "base": 84.6},
        {"id": "DEMO-LOHEGAON", "name": "Lohegaon", "lat": 18.5822, "lon": 73.9197, "base": 64.3},
        {"id": "DEMO-PASHAN", "name": "Pashan", "lat": 18.5414, "lon": 73.7928, "base": 52.1},
        {"id": "DEMO-KOTHRUD", "name": "Kothrud", "lat": 18.5074, "lon": 73.8077, "base": 68.0},
        {"id": "DEMO-WAKAD", "name": "Wakad", "lat": 18.5987, "lon": 73.7688, "base": 91.5},
    ]

    records = []
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=30)
    current = start_time

    # Hourly generation
    while current <= end_time:
        hour = (current.hour + 5) % 24  # IST hour
        is_rush = (8 <= hour <= 11) or (18 <= hour <= 21)
        rush_mult = 1.30 if is_rush else 0.88
        month = current.month
        # Winter inversion factor (Nov-Jan) vs Summer/Monsoon
        seasonal_mult = 1.35 if month in [11, 12, 1, 2] else (0.60 if month in [6, 7, 8, 9] else 1.0)

        for stn in stations:
            noise = np.random.normal(0, 5.0)
            pm25 = max(12.0, round(stn["base"] * rush_mult * seasonal_mult + noise, 1))

            records.append({
                "station_id": stn["id"],
                "station_name": stn["name"],
                "latitude": stn["lat"],
                "longitude": stn["lon"],
                "timestamp": current.isoformat(),
                "pm25": pm25,
                "pm10": round(pm25 * 1.65, 1),
                "temperature": round(26.0 - 5.0 * np.cos(np.pi * hour / 12) + np.random.normal(0, 0.5), 1),
                "humidity": round(55.0 + 20.0 * np.cos(np.pi * hour / 12) + np.random.normal(0, 2.0), 1),
                "wind_speed": round(max(1.0, 7.5 + 3.0 * np.sin(np.pi * hour / 12) + np.random.normal(0, 0.8)), 1),
                "wind_direction": round((240 + np.random.normal(0, 20)) % 360, 1),
                "pressure": 1012.0,
                "precipitation": 0.0,
                "traffic_index": round(1.4 if is_rush else 0.8, 2),
                "industrial_index": round(1.45 if stn["id"] == "DEMO-BHOSARI" else 1.0, 2),
                "data_status": "SYNTHETIC",
                "label": "[SAMPLE/DEMO] Offline Development Dataset",
                "source": "Calibrated Pune Statistical Replay",
            })
        current += timedelta(hours=1)

    df = pd.DataFrame(records)
    out_csv = SAMPLE_DIR / "pune_sample_measurements.csv"
    out_parquet = SAMPLE_DIR / "pune_sample_measurements.parquet"
    df.to_csv(out_csv, index=False)
    df.to_parquet(out_parquet, index=False)

    logger.info(f"Generated {len(df):,} sample records saved to:")
    logger.info(f" - {out_csv}")
    logger.info(f" - {out_parquet}")


if __name__ == "__main__":
    generate_sample_dataset()
